var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  connectionLimit : 1,
  port            : common.fakeServerPort,
  startConnections : 2
});

var server = common.createFakeServer();
var connection1time = 0, connection2time = 0;

server.listen(common.fakeServerPort, function(err){
  assert.ifError(err);

  pool.getConnection(function(err, conn){
    connection1time = Date.now();
    assert.ifError(err);

    setTimeout(function() {
      conn.release();
    }, 500);
  });

  pool.getConnection(function(err, conn) {
    assert.ifError(err);
    connection2time = Date.now();
    assert.ok(connection2time - connection1time < 250, 'waiting callbacks must be run at the same time');
    conn.release();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  setTimeout(function() {
    incomingConnection.handshake();
  }, 300);
});
