var common     = require('../../common');
var connection = common.createConnection({password: common.bogusPassword});
var assert     = require('assert');

connection.connect();
connection.query('SELECT 1');

var err;
connection.on('error', function(_err) {
  assert.equal(err, undefined);
  err = _err;
});
connection.end();

process.on('exit', function() {
  if (process.env.NO_GRANT == '1' && typeof err == 'undefined') return;

  assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
  assert.equal(err.fatal, true);
});
