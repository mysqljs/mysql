var assert   = require('assert');
var common   = require('../../common');
var path     = require('path');
var test     = require('utest');
var Template = common.Template

function tokens (...chunks) {
  const lexer = Template.makeLexer()
  const out = []
  for (let i = 0, len = chunks.length; i < len; ++i) {
    out.push(lexer(chunks[i]) || '_')
  }
  return out.join(',')
}


test('template lexer', {
  'empty string': function () {
    expect(tokens('')).to.equal('_')
  },
  'hash comments': function () {
    expect(tokens(' # "foo\n', '')).to.equal('_,_')
  },
  'dash comments': function () {
    expect(tokens(' -- \'foo\n', '')).to.equal('_,_')
  },
  'block comments': function () {
    expect(tokens(' /* `foo */', '')).to.equal('_,_')
  },
  'dq': function () {
    expect(tokens('SELECT "foo"')).to.equal('_')
    expect(tokens('SELECT `foo`, "foo"')).to.equal('_')
    expect(tokens('SELECT "', '"')).to.equal('",_')
    expect(tokens('SELECT "x', '"')).to.equal('",_')
    expect(tokens('SELECT "\'', '"')).to.equal('",_')
    expect(tokens('SELECT "`', '"')).to.equal('",_')
    expect(tokens('SELECT """', '"')).to.equal('",_')
    expect(tokens('SELECT "\\"', '"')).to.equal('",_')
  },
  'sq': function () {
    expect(tokens('SELECT \'foo\'')).to.equal('_')
    expect(tokens('SELECT `foo`, \'foo\'')).to.equal('_')
    expect(tokens('SELECT \'', '\'')).to.equal('\',_')
    expect(tokens('SELECT \'x', '\'')).to.equal('\',_')
    expect(tokens('SELECT \'"', '\'')).to.equal('\',_')
    expect(tokens('SELECT \'`', '\'')).to.equal('\',_')
    expect(tokens('SELECT \'\'\'', '\'')).to.equal('\',_')
    expect(tokens('SELECT \'\\\'', '\'')).to.equal('\',_')
  },
  'bq': function () {
    expect(tokens('SELECT `foo`')).to.equal('_')
    expect(tokens('SELECT "foo", `foo`')).to.equal('_')
    expect(tokens('SELECT `', '`')).to.equal('`,_')
    expect(tokens('SELECT `x', '`')).to.equal('`,_')
    expect(tokens('SELECT `\'', '`')).to.equal('`,_')
    expect(tokens('SELECT `"', '`')).to.equal('`,_')
    expect(tokens('SELECT ```', '`')).to.equal('`,_')
    expect(tokens('SELECT `\\`', '`')).to.equal('`,_')
  }
})

function runTagTest (golden, test) {
  // Run multiply to test memoization bugs.
  for (let i = 3; --i >= 0;) {
    let result = test()
    if (result instanceof Template.SqlFragment) {
      result = result.toString()
    } else {
      throw new Error(`Expected SqlFragment not ${result}`)
    }
    expect(result).to.equal(golden)
  }
}

test('template tag', {
  'numbers': function () {
    runTagTest(
      'SELECT 2',
      () => Template.sql`SELECT ${1 + 1}`)
  },
  'date': function () {
    runTagTest(
      `SELECT '2000-01-01 00:00:00.000'`,
      () => Template.sql`SELECT ${new Date(Date.UTC(2000, 0, 1, 0, 0, 0))}`)
  },
  'string': function () {
    runTagTest(
      `SELECT 'Hello, World!\\n'`,
      () => Template.sql`SELECT ${'Hello, World!\n'}`)
  },
  'identifier': function () {
    runTagTest(
      'SELECT `foo`',
      () => Template.sql`SELECT ${new Template.Identifier('foo')}`)
  },
  'fragment': function () {
    const fragment = new Template.SqlFragment('1 + 1')
    runTagTest(
      `SELECT 1 + 1`,
      () => Template.sql`SELECT ${fragment}`)
  },
  'fragment no token merging': function () {
    const fragment = new Template.SqlFragment('1 + 1')
    runTagTest(
      `SELECT 1 + 1 FROM T`,
      () => Template.sql`SELECT${fragment}FROM T`)
  },
  'string in dq string': function () {
    runTagTest(
      `SELECT "Hello, World!\\n"`,
      () => Template.sql`SELECT "Hello, ${'World!'}\n"`)
  },
  'string in sq string': function () {
    runTagTest(
      `SELECT 'Hello, World!\\n'`,
      () => Template.sql`SELECT 'Hello, ${'World!'}\n'`)
  },
  'string after string in string': function () {
    // The following tests check obliquely that '?' is not
    // interpreted as a prepared statement meta-character
    // internally.
    runTagTest(
      `SELECT 'Hello', "World?"`,
      () => Template.sql`SELECT '${'Hello'}', "World?"`)
  },
  'string before string in string': function () {
    runTagTest(
      `SELECT 'Hello?', 'World?'`,
      () => Template.sql`SELECT 'Hello?', '${'World?'}'`)
  },
  'number after string in string': function () {
    runTagTest(
      `SELECT 'Hello?', 123`,
      () => Template.sql`SELECT '${'Hello?'}', ${123}`)
  },
  'number before string in string': function () {
    runTagTest(
      `SELECT 123, 'World?'`,
      () => Template.sql`SELECT ${123}, '${'World?'}'`)
  },
  'string in identifier': function () {
    runTagTest(
      'SELECT `foo`',
      () => Template.sql`SELECT \`${'foo'}\``)
  },
  'number in identifier': function () {
    runTagTest(
      'SELECT `foo_123`',
      () => Template.sql`SELECT \`foo_${123}\``)
  },
  'array': function () {
    const id = new Template.Identifier('foo')
    const frag = new Template.sqlFragment('1 + 1')
    const values = [ 123, 'foo', id, frag ]
    runTagTest(
      "SELECT X FROM T WHERE X IN (123, 'foo', `foo`, 1 + 1)",
      () => Template.sql`SELECT X FROM T WHERE X IN (${values})`)
  }
})
