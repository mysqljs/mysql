var common = require('../../../common');
var assert = require('assert');
var INVALID_QUERY = 'first invalid #*&% query';

var client = common.createClient();
var err;

client
  .query(INVALID_QUERY)
  .on('error', function(_err) {
    err = _err;
    client.destroy();
  });

process.on('exit', function() {
  assert.ok(err);
  assert.strictEqual(err.sql, INVALID_QUERY);
});
