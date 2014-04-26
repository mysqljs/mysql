/**
 * This test is skipped, if the environment variable "windir" is set.
 * It assumes that it runs on a windows system then.
 */
if (process.env.windir) {
  return console.log('Skipping "test-unix-domain-socket.js" - Environment' 
    + ' variable "windir" is set. Skipping this, because we seem to be on' 
    + ' a windows system');  
}
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
