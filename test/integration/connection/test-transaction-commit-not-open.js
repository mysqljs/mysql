var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

connection.commit(function(err) {
  assert.equal(err.message, 'Cannot commit: No transaction is currently open.');
  connection.end();
});