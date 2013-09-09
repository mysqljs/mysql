var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

connection.rollback(function(err) {
  assert.equal(err.message, 'Cannot roll back: No transaction is currently open.');
  connection.end();
});

