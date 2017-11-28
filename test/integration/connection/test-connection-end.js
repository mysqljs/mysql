var assert = require('assert');
var common = require('../../common');

// Should end a connection without the optional callback; does not gurantee
// that the connection.state === 'disconnected'
common.getTestConnection(function (err, connection) {
  assert.ifError(err);
  connection.end();
});

// Should end a connection with the optional callback and ensure that
// connection.state === 'disconnected'
common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.end(function (err) {
    assert.ifError(err);
    assert.ok(connection.state === 'disconnected');
  });
});
