/**
 * This test is skipped on Windows.
 */

var assert = require('assert');
var common = require('../../common');

if (process.platform === 'win32') {
  common.skipTest('windows does not support unix sockets');
}

var connection = common.createConnection({socketPath: common.fakeServerSocket});
var server     = common.createFakeServer();
var didConnect = false;

server.listen(common.fakeServerSocket, function (err) {
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
