var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

connection.beginTransaction(function(err) {
  assert.ifError(err);
  connection.beginTransaction(function(err) {
    assert.equal(err.message, 'Cannot begin transaction: A transaction is already open.');
    connection.end();
  });
});