const Mysql = require('../index');
const {
  memoizedTagFunction,
  trimCommonWhitespaceFromLines,
  TypedString
} = require('template-tag-common');

// A simple lexer for SQL.
// SQL has many divergent dialects with subtly different
// conventions for string escaping and comments.
// This just attempts to roughly tokenize MySQL's specific variant.
// See also
// https://www.w3.org/2005/05/22-SPARQL-MySQL/sql_yacc
// https://github.com/twitter/mysql/blob/master/sql/sql_lex.cc
// https://dev.mysql.com/doc/refman/5.7/en/string-literals.html

// "--" followed by whitespace starts a line comment
// "#"
// "/*" starts an inline comment ended at first "*/"
// \N means null
// Prefixed strings x'...' is a hex string,  b'...' is a binary string, ....
// '...', "..." are strings.  `...` escapes identifiers.
// doubled delimiters and backslash both escape
// doubled delimiters work in `...` identifiers

const PREFIX_BEFORE_DELIMITER = new RegExp(
  '^(?:' +
    (
      // Comment
      '--(?=[\\t\\r\\n ])[^\\r\\n]*' +
      '|#[^\\r\\n]*' +
      '|/[*][\\s\\S]*?[*]/'
    ) +
    '|' +
    (
      // Run of non-comment non-string starts
      '(?:[^\'"`\\-/#]|-(?!-)|/(?![*]))'
    ) +
    ')*');
const DELIMITED_BODIES = {
  '\'' : /^(?:[^'\\]|\\[\s\S]|'')*/,
  '"'  : /^(?:[^"\\]|\\[\s\S]|"")*/,
  '`'  : /^(?:[^`\\]|\\[\s\S]|``)*/
};

/**
 * Template tag that creates a new Error with a message.
 * @param {!Array.<string>} strs a valid TemplateObject.
 * @return {string} A message suitable for the Error constructor.
 */
function msg (strs, ...dyn) {
  let message = String(strs[0]);
  for (let i = 0; i < dyn.length; ++i) {
    message += JSON.stringify(dyn[i]) + strs[i + 1];
  }
  return message;
}

/**
 * Returns a function that can be fed chunks of input and which
 * returns a delimiter context.
 *
 * @return {!function (string) : string}
 *    a stateful function that takes a string of SQL text and
 *    returns the context after it.  Subsequent calls will assume
 *    that context.
 */
function makeLexer () {
  let errorMessage = null;
  let delimiter = null;
  return (text) => {
    if (errorMessage) {
      // Replay the error message if we've already failed.
      throw new Error(errorMessage);
    }
    text = String(text);
    while (text) {
      const pattern = delimiter
        ? DELIMITED_BODIES[delimiter]
        : PREFIX_BEFORE_DELIMITER;
      const match = pattern.exec(text);
      if (!match) {
        throw new Error(
          errorMessage = msg`Failed to lex starting at ${text}`);
      }
      let nConsumed = match[0].length;
      if (text.length > nConsumed) {
        const chr = text.charAt(nConsumed);
        if (delimiter) {
          if (chr === delimiter) {
            delimiter = null;
            ++nConsumed;
          } else {
            throw new Error(
              errorMessage = msg`Expected ${chr} at ${text}`);
          }
        } else if (Object.hasOwnProperty.call(DELIMITED_BODIES, chr)) {
          delimiter = chr;
          ++nConsumed;
        } else {
          throw new Error(
            errorMessage = msg`Expected delimiter at ${text}`);
        }
      }
      text = text.substring(nConsumed);
    }
    return delimiter;
  };
}

/** A string wrapper that marks its content as a SQL identifier. */
class Identifier extends TypedString {}

/**
 * A string wrapper that marks its content as a series of
 * well-formed SQL tokens.
 */
class SqlFragment extends TypedString {}

/**
 * Analyzes the static parts of the tag content.
 *
 * @param {!Array.<string>} strings a valid TemplateObject.
 * @return { !{
 *       raw: !Array.<string>,
 *       delimiters : !Array.<string>,
 *       chunks: !Array.<string>
 *     } }
 *     A record like { raw, delimiters, chunks }
 *     where delimiter is a contextual cue and chunk is
 *     the adjusted raw text.
 */
function computeStatic (strings) {
  const { raw } = trimCommonWhitespaceFromLines(strings);

  const delimiters = [];
  const chunks = [];

  const lexer = makeLexer();

  let delimiter = null;
  for (let i = 0, len = raw.length; i < len; ++i) {
    let chunk = String(raw[i]);
    if (delimiter === '`') {
      // Treat raw \` in an identifier literal as an ending delimiter.
      chunk = chunk.replace(/^([^\\`]|\\[\s\S])*\\`/, '$1`');
    }
    const newDelimiter = lexer(chunk);
    if (newDelimiter === '`' && !delimiter) {
      // Treat literal \` outside a string context as starting an
      // identifier literal
      chunk = chunk.replace(
        /((?:^|[^\\])(?:\\\\)*)\\(`(?:[^`\\]|\\[\s\S])*)$/, '$1$2');
    }

    chunks.push(chunk);
    delimiters.push(newDelimiter);
    delimiter = newDelimiter;
  }

  if (delimiter) {
    throw new Error(`Unclosed quoted string: ${delimiter}`);
  }

  return { raw, delimiters, chunks };
}

function interpolateSqlIntoFragment (
  { raw, delimiters, chunks }, strings, values) {
  // A buffer to accumulate output.
  let [ result ] = chunks;
  for (let i = 1, len = raw.length; i < len; ++i) {
    const chunk = chunks[i];
    // The count of values must be 1 less than the surrounding
    // chunks of literal text.
    if (i !== 0) {
      const delimiter = delimiters[i - 1];
      const value = values[i - 1];
      if (delimiter) {
        result += escapeDelimitedValue(value, delimiter);
      } else {
        result = appendValue(result, value, chunk);
      }
    }

    result += chunk;
  }

  return new SqlFragment(result);
}

function escapeDelimitedValue (value, delimiter) {
  if (delimiter === '`') {
    return Mysql.escapeId(String(value)).replace(/^`|`$/g, '');
  }
  const escaped = Mysql.escape(String(value));
  return escaped.substring(1, escaped.length - 1);
}

function appendValue (resultBefore, value, chunk) {
  let needsSpace = false;
  let result = resultBefore;
  const valueArray = Array.isArray(value) ? value : [ value ];
  for (let i = 0, nValues = valueArray.length; i < nValues; ++i) {
    if (i) {
      result += ', ';
    }

    const one = valueArray[i];
    let valueStr = null;
    if (one instanceof SqlFragment) {
      if (!/(?:^|[\n\r\t ,\x28])$/.test(result)) {
        result += ' ';
      }
      valueStr = one.toString();
      needsSpace = i + 1 === nValues;
    } else if (one instanceof Identifier) {
      valueStr = Mysql.escapeId(one.toString());
    } else {
      // If we need to handle nested arrays, we would recurse here.
      valueStr = Mysql.format('?', one);
    }
    result += valueStr;
  }

  if (needsSpace && chunk && !/^[\n\r\t ,\x29]/.test(chunk)) {
    result += ' ';
  }

  return result;
}

/**
 * Template tag function that contextually autoescapes values
 * producing a SqlFragment.
 */
const sql = memoizedTagFunction(computeStatic, interpolateSqlIntoFragment);
sql.Identifier = Identifier;
sql.Fragment = SqlFragment;

if (require('process').env.npm_lifecycle_event === 'test') {
  // Expose for testing.
  // Harmless if this leaks
  sql.makeLexer = makeLexer;
}

module.exports = sql;
