var assert = require('assert');
var common = require('../common');
var path   = require('path');
var test   = require('utest');
var Mysql  = require(path.resolve(common.lib, '../index'));

test('Mysql.format', {
  'format SQL with identifiers and values': function() {
    assert.equal(
      Mysql.format('SELECT * FROM ?? WHERE ?? = ?', ['table', 'property', 123]),
      'SELECT * FROM `table` WHERE `property` = 123'
    );
  },

  'format SQL with object value': function() {
    assert.equal(
      Mysql.format('INSERT INTO ?? SET ?', ['table', {property: 123}]),
      'INSERT INTO `table` SET `property` = 123'
    );
  }
});
