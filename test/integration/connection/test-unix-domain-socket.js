/**
 * If on a windows system, there are no unix sockets.
 * So we skip this test and defaulting the asserts in the
 * process.on('exit', [...]) function to false, when we find the
 * enviroment variable 'windir' is set. I assume 'windir' will not be set on
 * *nix-systems.
 */
var common     = require('../../common');
var connection = common.createConnection({socketPath: common.fakeServerSocket});
var assert     = require('assert');

var server = common.createFakeServer();
var didConnect = false;
if (!process.env.windir) {
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
}

var hadConnection = false;
if (!process.env.windir) {
  server.on('connection', function(connection) {
    connection.handshake();

    assert.equal(hadConnection, false);
    hadConnection = true;
  });
}

process.on('exit', function() {
  if (process.env.windir) {
    assert.equal(didConnect, false);
    assert.equal(hadConnection, false);
  } else {
    assert.equal(didConnect, true);
    assert.equal(hadConnection, true);
  }
});