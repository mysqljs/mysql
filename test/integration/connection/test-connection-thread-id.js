var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection();

assert.strictEqual(connection.threadId, null);

connection.connect(function(err) {
  assert.ifError(err);
  assert.notStrictEqual(connection.threadId, null);
  assert.notStrictEqual(connection.threadId, 0);

  connection.end(function(err) {
    assert.ifError(err);
    assert.notStrictEqual(connection.threadId, null);
    assert.notStrictEqual(connection.threadId, 0);
  });
});
