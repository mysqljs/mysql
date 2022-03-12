var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

var seq        = 0;
var serverConn = null;
var tid        = 0;

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({
    connectionLimit : 1,
    port            : server.port()
  });

  pool.getConnection(function(err, conn){
    assert.ifError(err);
    assert.equal(conn.threadId, 1);
    conn.release();

    // server destroys connection in pool
    // read ECONNRESET
    serverConn.destroy();

    pool.getConnection(function(err, conn){
      assert.ifError(err);
      assert.equal(++seq, 1);
      assert.equal(conn.threadId, 2);
      conn.ping(function(err){
        assert.ifError(err);
        conn.release();
      });
    });

    pool.getConnection(function(err, conn){
      assert.ifError(err);
      assert.equal(++seq, 2);
      assert.equal(conn.threadId, 2);
      server.destroy();
    });
  });
});

server.on('connection', function(incomingConnection) {
  serverConn = incomingConnection;
  incomingConnection.handshake({
    threadId: ++tid
  });
});
