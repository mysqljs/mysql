var common = require('../common');
var assert = require('assert');
var test   = require('utest');
var escape = require(common.dir.lib + '/escape');

test('escape', {
  'undefined -> NULL': function() {
    assert.equal(escape(undefined), 'NULL');
  },

  'null -> NULL': function() {
    assert.equal(escape(null), 'NULL');
  },

  'booleans convert to strings': function() {
    assert.equal(escape(false), 'false');
    assert.equal(escape(true), 'true');
  },

  'numbers convert to strings': function() {
    assert.equal(escape(5), '5');
  },

  'objects are stringified': function() {
    assert.equal(escape({foo:'bar'}), "'[object Object]'");
  },

  'arrays are turned into lists': function() {
    assert.equal(escape([1,2,3]), "'1,2,3'");
  },

  'strings are quoted': function() {
    assert.equal(escape('Super'), "'Super'");
  },

  '\0 gets escaped': function() {
    assert.equal(escape('Sup\0er'), "'Sup\\0er'");
  },

  '\b gets escaped': function() {
    assert.equal(escape('Sup\ber'), "'Sup\\ber'");
  },

  '\n gets escaped': function() {
    assert.equal(escape('Sup\ner'), "'Sup\\ner'");
  },

  '\r gets escaped': function() {
    assert.equal(escape('Sup\rer'), "'Sup\\rer'");
  },

  '\t gets escaped': function() {
    assert.equal(escape('Sup\ter'), "'Sup\\ter'");
  },

  '\\ gets escaped': function() {
    assert.equal(escape('Sup\\er'), "'Sup\\\\er'");
  },

  '\u gets escaped': function() {
    assert.equal(escape('Sup\u001aer'), "'Sup\\Zer'");
  },

  'single quotes get escaped': function() {
    assert.equal(escape('Sup\'er'), "'Sup\\'er'");
  },

  'double quotes get escaped': function() {
    assert.equal(escape('Sup"er'), "'Sup\\\"er'");
  },

  'dates are turned into toISOString': function() {
    var date = new Date(Date.UTC(2011, 6, 6, 6, 6, 6, 6));
    assert.equal(escape(date), "'" + date.toISOString() + "'");
  },
});
