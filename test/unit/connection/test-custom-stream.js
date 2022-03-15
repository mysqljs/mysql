var assert     = require('assert');
var Net        = require('net');
var common     = require('../../common');

function streamFactory() {
  return Net.createConnection(common.fakeServerPort);
}

var connection = common.createConnection({stream: streamFactory});

var server = common.createFakeServer();
var didConnect = false;

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err) {
    assert.ifError(err);

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
