var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  user            : 'user_1',
  port            : common.fakeServerPort
});

var server = common.createFakeServer();
var thread = 0;

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.threadId, 1);
    conn.release();
  });

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.threadId, 1);

    conn.changeUser({user: 'user_2'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(conn.threadId, 1);
      conn.release();
    });
  });

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.threadId, 2);
    conn.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    threadId: ++thread
  });
});
