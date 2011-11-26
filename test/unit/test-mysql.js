var common = require('../common');
var assert = require('assert');
var test   = require('utest');
var mysql  = require(common.dir.root);

test('mysql module', {
  'Package JSON is exported': function() {
    assert.strictEqual(mysql.PACKAGE.name, 'mysql');
  },
});
