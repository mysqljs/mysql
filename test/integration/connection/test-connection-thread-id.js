var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);
  assert.notStrictEqual(connection.threadId, null);
  assert.notStrictEqual(connection.threadId, 0);

  connection.end(function (err) {
    assert.ifError(err);
    assert.notStrictEqual(connection.threadId, null);
    assert.notStrictEqual(connection.threadId, 0);
  });
});
