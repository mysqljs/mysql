var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.slowTestCase();
var Client = require(common.dir.lib + '/client');

test.before(function() {
  this.client = new Client();
});

test('#format() does not manipulate params parameter', function() {
  var sql = '?';
  var params = [1];

  this.client.format(sql, params);
  assert.equal(params.length, 1);
});
