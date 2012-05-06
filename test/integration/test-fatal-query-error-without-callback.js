var common     = require('../common');
var connection = common.createConnection({port: common.bogusPort});
var assert     = require('assert');

connection.connect();
var query = connection.query('SELECT 1');

var err;
query.on('error', function(_err) {
  assert.equal(err, undefined);
  err = _err;
});

connection.end();

process.on('exit', function() {
  assert.equal(err.code, 'ECONNREFUSED');
  assert.equal(err.fatal, true);
});
