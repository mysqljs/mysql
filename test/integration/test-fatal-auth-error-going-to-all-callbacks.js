var common     = require('../common');
var connection = common.createConnection({password: common.bogusPassword});
var assert     = require('assert');

var errors = {};

connection.connect(function(err) {
  errors.a = err;
});

connection.query('SELECT 1', function(err) {
  errors.b = err;
});

process.on('exit', function() {
  assert.equal(errors.a.code, 'ER_ACCESS_DENIED_ERROR');
  assert.equal(errors.a.fatal, true);
  assert.strictEqual(errors.a, errors.b);
});
