var common = require('../../common');
var assert = require('assert');
var pool   = common.createPool({
  connectionLimit    : 1,
  port               : common.fakeServerPort,
  queueLimit         : 5,
  waitForConnections : true
});

var connErr   = null;
var poolEnded = false;
var server    = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  pool.getConnection(function(err, conn){
    if (err) throw err;

    pool.end(function(err) {
      poolEnded = true;
      server.destroy();
      if (err) throw err;
    });

    conn.release();
  });

  pool.getConnection(function(err, conn){
    connErr = err;
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake();
});

process.on('exit', function() {
  assert.ok(poolEnded);
  assert.ok(connErr);
  assert.equal(connErr.message, 'Pool is closed.');
});
