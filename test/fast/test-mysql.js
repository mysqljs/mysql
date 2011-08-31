var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.fast();
var mysql = require(common.dir.lib + '/mysql');

test('Package JSON is exported', function() {
  assert.strictEqual(mysql.PACKAGE.name, 'mysql');
});
