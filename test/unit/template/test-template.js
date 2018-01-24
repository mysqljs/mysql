var assert   = require('assert');
var common   = require('../../common');
var test     = require('utest');
var Template = common.Template;

function tokens (...chunks) {
  const lexer = Template.makeLexer();
  const out = [];
  for (let i = 0, len = chunks.length; i < len; ++i) {
    out.push(lexer(chunks[i]) || '_');
  }
  return out.join(',');
}

for (let k in Template) {
  console.log('%s in Template', k);
}

test('template lexer', {
  'empty string': function () {
    assert.equal(tokens(''), '_');
  },
  'hash comments': function () {
    assert.equal(tokens(' # "foo\n', ''), '_,_');
  },
  'dash comments': function () {
    assert.equal(tokens(' -- \'foo\n', ''), '_,_');
  },
  'block comments': function () {
    assert.equal(tokens(' /* `foo */', ''), '_,_');
  },
  'dq': function () {
    assert.equal(tokens('SELECT "foo"'), '_');
    assert.equal(tokens('SELECT `foo`, "foo"'), '_');
    assert.equal(tokens('SELECT "', '"'), '",_');
    assert.equal(tokens('SELECT "x', '"'), '",_');
    assert.equal(tokens('SELECT "\'', '"'), '",_');
    assert.equal(tokens('SELECT "`', '"'), '",_');
    assert.equal(tokens('SELECT """', '"'), '",_');
    assert.equal(tokens('SELECT "\\"', '"'), '",_');
  },
  'sq': function () {
    assert.equal(tokens('SELECT \'foo\''), '_');
    assert.equal(tokens('SELECT `foo`, \'foo\''), '_');
    assert.equal(tokens('SELECT \'', '\''), '\',_');
    assert.equal(tokens('SELECT \'x', '\''), '\',_');
    assert.equal(tokens('SELECT \'"', '\''), '\',_');
    assert.equal(tokens('SELECT \'`', '\''), '\',_');
    assert.equal(tokens('SELECT \'\'\'', '\''), '\',_');
    assert.equal(tokens('SELECT \'\\\'', '\''), '\',_');
  },
  'bq': function () {
    assert.equal(tokens('SELECT `foo`'), '_');
    assert.equal(tokens('SELECT "foo", `foo`'), '_');
    assert.equal(tokens('SELECT `', '`'), '`,_');
    assert.equal(tokens('SELECT `x', '`'), '`,_');
    assert.equal(tokens('SELECT `\'', '`'), '`,_');
    assert.equal(tokens('SELECT `"', '`'), '`,_');
    assert.equal(tokens('SELECT ```', '`'), '`,_');
    assert.equal(tokens('SELECT `\\`', '`'), '`,_');
  }
});

function runTagTest (golden, test) {
  // Run multiply to test memoization bugs.
  for (let i = 3; --i >= 0;) {
    let result = test();
    if (result instanceof Template.Fragment) {
      result = result.toString();
    } else {
      throw new Error(`Expected SqlFragment not ${result}`);
    }
    assert.equal(result, golden);
  }
}

test('template tag', {
  'numbers': function () {
    runTagTest(
      'SELECT 2',
      () => Template`SELECT ${1 + 1}`);
  },
  'date': function () {
    runTagTest(
      `SELECT '2000-01-01 00:00:00.000'`,
      () => Template`SELECT ${new Date(Date.UTC(2000, 0, 1, 0, 0, 0))}`);
  },
  'string': function () {
    runTagTest(
      `SELECT 'Hello, World!\\n'`,
      () => Template`SELECT ${'Hello, World!\n'}`);
  },
  'identifier': function () {
    runTagTest(
      'SELECT `foo`',
      () => Template`SELECT ${new Template.Identifier('foo')}`);
  },
  'fragment': function () {
    const fragment = new Template.Fragment('1 + 1');
    runTagTest(
      `SELECT 1 + 1`,
      () => Template`SELECT ${fragment}`);
  },
  'fragment no token merging': function () {
    const fragment = new Template.Fragment('1 + 1');
    runTagTest(
      `SELECT 1 + 1 FROM T`,
      () => Template`SELECT${fragment}FROM T`);
  },
  'string in dq string': function () {
    runTagTest(
      `SELECT "Hello, World!\\n"`,
      () => Template`SELECT "Hello, ${'World!'}\n"`);
  },
  'string in sq string': function () {
    runTagTest(
      `SELECT 'Hello, World!\\n'`,
      () => Template`SELECT 'Hello, ${'World!'}\n'`);
  },
  'string after string in string': function () {
    // The following tests check obliquely that '?' is not
    // interpreted as a prepared statement meta-character
    // internally.
    runTagTest(
      `SELECT 'Hello', "World?"`,
      () => Template`SELECT '${'Hello'}', "World?"`);
  },
  'string before string in string': function () {
    runTagTest(
      `SELECT 'Hello?', 'World?'`,
      () => Template`SELECT 'Hello?', '${'World?'}'`);
  },
  'number after string in string': function () {
    runTagTest(
      `SELECT 'Hello?', 123`,
      () => Template`SELECT '${'Hello?'}', ${123}`);
  },
  'number before string in string': function () {
    runTagTest(
      `SELECT 123, 'World?'`,
      () => Template`SELECT ${123}, '${'World?'}'`);
  },
  'string in identifier': function () {
    runTagTest(
      'SELECT `foo`',
      () => Template`SELECT \`${'foo'}\``);
  },
  'number in identifier': function () {
    runTagTest(
      'SELECT `foo_123`',
      () => Template`SELECT \`foo_${123}\``);
  },
  'array': function () {
    const id = new Template.Identifier('foo');
    const frag = new Template.Fragment('1 + 1');
    const values = [ 123, 'foo', id, frag ];
    runTagTest(
      "SELECT X FROM T WHERE X IN (123, 'foo', `foo`, 1 + 1)",
      () => Template`SELECT X FROM T WHERE X IN (${values})`);
  }
});
