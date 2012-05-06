var common     = require('../common');
var connection = common.createConnection({password: common.bogusPassword});
var assert     = require('assert');

connection.connect();
connection.query('SELECT 1');

var err;
connection.on('error', function(_err) {
  assert.equal(err, undefined);
  err = _err;
});

process.on('exit', function() {
  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.equal(err.fatal, true);
});
