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

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var conn0;
  var threadId;
  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.ok(conn.threadId === 1 || conn.threadId === 2);
    conn0 = conn;
  });

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    assert.ok(conn.threadId === 1 || conn.threadId === 2);
    threadId = conn.threadId;

    conn.changeUser({user: 'user_2'}, function(err) {
      assert.ifError(err);
      assert.strictEqual(conn.threadId, threadId);

      conn.query('SELECT CURRENT_USER()', function (err, rows) {
        assert.ifError(err);
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0]['CURRENT_USER()'], 'user_2@localhost');
        conn.release();
      });
    });
  });

  pool.getConnection(function(err, conn1) {
    assert.ifError(err);
    assert.strictEqual(conn1.threadId, threadId);

    conn1.query('SELECT CURRENT_USER()', function (err, rows) {
      assert.ifError(err);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0]['CURRENT_USER()'], 'user_1@localhost');

      pool.getConnection(function(err, conn2) {
        assert.ifError(err);
        assert.ok(conn2.threadId === 1 || conn2.threadId === 2);
        conn1.release();
        conn2.release();

        pool.end(function(err) {
          assert.ifError(err);
          assert.strictEqual(closed, 2);
          server.destroy();
        });
      });

      conn0.release();
    });
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    threadId: ++thread
  });
  incomingConnection.on('quit', function() {
    closed++;
    incomingConnection._socket.end();
  });
});
