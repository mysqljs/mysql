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

  pool.getConnection(function(err, conn0) {
    assert.ifError(err);
    assert.ok(conn0.threadId === 1 || conn0.threadId === 2);

    pool.getConnection(function(err, conn1) {
      assert.ifError(err);
      assert.ok(conn1.threadId === 1 || conn1.threadId === 2);

      var threadId = conn1.threadId;

      conn1.changeUser({user: 'user_2'}, function(err) {
        assert.ifError(err);
        assert.strictEqual(conn1.threadId, threadId);

        conn1.query('SELECT CURRENT_USER()', function (err, rows) {
          assert.ifError(err);
          assert.strictEqual(rows.length, 1);
          assert.strictEqual(rows[0]['CURRENT_USER()'], 'user_2@localhost');
          conn1.release();
        });
      });

      pool.getConnection(function(err, conn2) {
        assert.ifError(err);
        assert.strictEqual(conn2.threadId, threadId);

        conn2.query('SELECT CURRENT_USER()', function (err, rows) {
          assert.ifError(err);
          assert.strictEqual(rows.length, 1);
          assert.strictEqual(rows[0]['CURRENT_USER()'], 'user_1@localhost');

          pool.getConnection(function(err, conn3) {
            assert.ifError(err);
            assert.ok(conn3.threadId === 1 || conn3.threadId === 2);
            conn2.release();
            conn3.release();

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
