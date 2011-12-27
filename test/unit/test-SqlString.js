var common = require('../common');
var assert = require('assert');
var test   = require('utest');
var SqlString = require(common.dir.lib + '/SqlString');

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

  'objects are stringified': function() {
    assert.equal(SqlString.escape({foo:'bar'}), "'[object Object]'");
  },

  'arrays are turned into lists': function() {
    assert.equal(SqlString.escape([1,2,3]), "'1,2,3'");
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

  '\u001 (ascii 26) gets replaced with \\Z': function() {
    assert.equal(SqlString.escape('Sup\u001aer'), "'Sup\\Zer'");
  },

  'single quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup\'er'), "'Sup\\'er'");
  },

  'double quotes get escaped': function() {
    assert.equal(SqlString.escape('Sup"er'), "'Sup\\\"er'");
  },

  'dates are turned into toISOString': function() {
    var date = new Date(Date.UTC(2011, 6, 6, 6, 6, 6, 6));
    assert.equal(SqlString.escape(date), "'" + date.toISOString() + "'");
  },
});
