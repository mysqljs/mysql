var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var count    = 0;
  var threadId = -1;
  pool.on('acquire', function (connection) {
    count++;
    threadId = connection.threadId;
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    assert.equal(count, 1);
    assert.equal(threadId, connection.threadId);
    connection.release();
  });

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection);
    assert.equal(count, 2);
    assert.equal(threadId, connection.threadId);
    connection.release();
    pool.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });
});
