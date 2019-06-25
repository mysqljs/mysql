var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  acquireTimeout  : 200,
  connectionLimit : 1,
  port            : common.fakeServerPort
});
var server  = common.createFakeServer();

var fail = false;
var seq  = 0;
var tid  = 0;

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, conn) {
    assert.ifError(err);
    assert.equal(conn.threadId, 1);
    conn.release();

    // lag the next ping
    fail = true;

    pool.getConnection(function(err, conn){
      assert.ifError(err);
      assert.equal(++seq, 1);
      assert.equal(conn.threadId, 2);
      assert.equal(fail, false);
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
  incomingConnection.handshake({
    threadId: ++tid
  });
  incomingConnection.on('ping', function() {
    if (!fail) {
      this.ok();
    }

    fail = false;
  });
});
