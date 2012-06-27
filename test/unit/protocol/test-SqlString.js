var common    = require('../../common');
var test      = require('utest');
var assert    = require('assert');
var SqlString = require(common.lib + '/protocol/SqlString');

test('SqlString.escape', {
  'undefined -> NULL': function() {
    assert.equal(SqlString.escape(undefined), 'NULL');
  },

  'null -> NULL': function() {
    assert.equal(SqlString.escape(null), 'NULL');
  },

  'booleans convert to strings': function() {
    assert.equal(SqlString.escape(false), 'false');
    assert.equal(SqlString.escape(true), 'true');
  },

  'numbers convert to strings': function() {
    assert.equal(SqlString.escape(5), '5');
  },

  'objects are turned into key value pairs': function() {
    assert.equal(SqlString.escape({a: 'b', c: 'd'}), "`a` = 'b', `c` = 'd'");
  },

  'objects function properties are ignored': function() {
    assert.equal(SqlString.escape({a: 'b', c: function() {}}), "`a` = 'b'");
  },

  'nested objects are cast to strings': function() {
    assert.equal(SqlString.escape({a: {nested: true}}), "`a` = '[object Object]'");
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escape([1, 2, 'c']), "1, 2, 'c'");
  },

  'nested objects inside arrays are cast to strings': function() {
    assert.equal(SqlString.escape([1, {nested: true}, 2]), "1, '[object Object]', 2");
  },

  'strings are quoted': function() {
    assert.equal(SqlString.escape('Super'), "'Super'");
  },

  '\0 gets escaped': function() {
    assert.equal(SqlString.escape('Sup\0er'), "'Sup\\0er'");
  },

  '\b gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ber'), "'Sup\\ber'");
  },

  '\n gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ner'), "'Sup\\ner'");
  },

  '\r gets escaped': function() {
    assert.equal(SqlString.escape('Sup\rer'), "'Sup\\rer'");
  },

  '\t gets escaped': function() {
    assert.equal(SqlString.escape('Sup\ter'), "'Sup\\ter'");
  },

  '\\ gets escaped': function() {
    assert.equal(SqlString.escape('Sup\\er'), "'Sup\\\\er'");
  },

  '\u001a (ascii 26) gets replaced with \\Z': function() {
    assert.equal(SqlString.escape('Sup\u001aer'), "'Sup\\Zer'");
  },

  'single quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup\'er'), "'Sup\\'er'");
  },

  'double quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup"er'), "'Sup\\\"er'");
  },

  'dates are converted to YYYY-MM-DD HH:II:SS': function() {
    var expected = '2012-05-07 11:42:03';
    var date     = new Date(expected);
    var string   = SqlString.escape(date);

    assert.strictEqual(string, "'" + expected + "'");
  },

  'buffers are converted to hex': function() {
    var buffer = new Buffer([0, 1, 254, 255]);
    var string = SqlString.escape(buffer);

    assert.strictEqual(string, "X'0001feff'");
  },

  'NaN -> NaN': function() {
    assert.equal(SqlString.escape(NaN), 'NaN');
  },

  'Infinity -> Infinity': function() {
    assert.equal(SqlString.escape(Infinity), 'Infinity');
  },
});

test('SqlString.format', {
  'question marks are replaced with escaped array values': function() {
    var sql = SqlString.format('? and ?', ['a', 'b']);
    assert.equal(sql, "'a' and 'b'");
  },

  'extra question marks are left untouched': function() {
    var sql = SqlString.format('? and ?', ['a']);
    assert.equal(sql, "'a' and ?");
  },

  'extra arguments are not used': function() {
    var sql = SqlString.format('? and ?', ['a', 'b', 'c']);
    assert.equal(sql, "'a' and 'b'");
  },

  'question marks within values do not cause issues': function() {
    var sql = SqlString.format('? and ?', ['hello?', 'b']);
    assert.equal(sql, "'hello?' and 'b'");
  },
});
