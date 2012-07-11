var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect();
connection.query('INVALID SQL');

var err;
connection.on('error', function(_err) {
  assert.equal(err, undefined);
  err = _err;
});

connection.end();

process.on('exit', function() {
  assert.equal(err.code, 'ER_PARSE_ERROR');
  assert.equal(Boolean(err.fatal), false);
});
