var common     = require('../common');
var connection = common.createConnection({port: common.bogusPort});
var assert     = require('assert');

var errors = {};

connection.connect(function(err) {
  errors.a = err;
});

connection.query('SELECT 1', function(err) {
  errors.b = err;
});

process.on('exit', function() {
  assert.equal(errors.a.code, 'ECONNREFUSED');
  assert.equal(errors.b.fatal, true);
  assert.strictEqual(errors.a, errors.b);
});
