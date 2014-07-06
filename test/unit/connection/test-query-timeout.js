var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var server     = common.createFakeServer();

var connClosed = false;

server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.query({sql: 'SELECT 1', timeout: 20}, function (err, rows) {
    assert.ok(err);
    assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
    assert.equal(err.fatal, true);
    assert.equal(err.message, 'Query inactivity timeout');
    assert.equal(err.timeout, 20);

    setTimeout(function() {
      assert.ok(connClosed);
      server.destroy();
    }, 10);
  });
});

server.on('connection', function(conn) {
  conn.handshake();
  conn._socket.on('close', function() {
    connClosed = true;
  });
  conn.on('query', function(packet) {
    // Do nothing; timeout
  });
});
