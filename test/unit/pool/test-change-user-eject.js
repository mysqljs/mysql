var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 2,
  user            : 'user_1',
  port            : common.fakeServerPort
});

var closed = 0;
var server = common.createFakeServer();
var thread = 0;
var connections = 0;

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  pool.on('connection', function(conn) {
    connections++;
  });

  var conn0;
  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.threadId, 1);
    assert.strictEqual(connections, 1);
    conn0 = conn;
  });

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.strictEqual(conn.threadId, 2);
    assert.strictEqual(connections, 2);

    conn.changeUser({user: 'user_2'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(connections, 2);
      assert.strictEqual(conn.threadId, 2);
      conn.release();
      conn0.release();
    });
  });

  pool.getConnection(function(err, conn1) {
    assert.ifError(err);
    assert.strictEqual(connections, 2);
    assert.strictEqual(conn1.threadId, 1);
    assert.strictEqual(conn1.config.user, 'user_1');

    pool.getConnection(function(err, conn2) {
      assert.ifError(err);
      assert.strictEqual(connections, 3);
      assert.strictEqual(conn1.config.user, 'user_1');
      assert.strictEqual(conn2.threadId, 2);
      conn1.release();
      conn2.release();

      pool.end(function(err) {
        assert.ifError(err);
        assert.strictEqual(closed, 2);
        server.destroy();
      });
    });
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    threadId: ++thread
  });
  incomingConnection.on('quit', function() {
    closed++;
  });
});
