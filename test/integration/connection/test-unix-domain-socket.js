var common     = require('../../common');
var connection = common.createConnection({socketPath: common.fakeServerSocket});
var assert     = require('assert');

var server = common.createFakeServer();
var didConnect = false;
server.listen(common.fakeServerSocket, function(err) {
  if (err) throw err;

  connection.connect(function(err) {
    if (err) throw err;

    assert.equal(didConnect, false);
    didConnect = true;

    connection.destroy();
    server.destroy();
  });
});

var hadConnection = false;
server.on('connection', function(connection) {
  connection.handshake();

  assert.equal(hadConnection, false);
  hadConnection = true;
});

process.on('exit', function() {
  assert.equal(didConnect, true);
  assert.equal(hadConnection, true);
});
