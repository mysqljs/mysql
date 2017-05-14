var assert     = require('assert');
var Buffer     = require('safe-buffer').Buffer;
var common     = require('../../common');
var connection = common.createConnection({
  port     : common.fakeServerPort,
  password : 'authswitch'
});

var server = common.createFakeServer();

var connected;
server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.connect(function (err, result) {
    assert.ifError(err);

    connected = result;

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user           : connection.config.user,
    password       : connection.config.password,
    authMethodName : 'mysql_native_password',
    authMethodData : Buffer.from('00112233445566778899AABBCCDDEEFF0102030400', 'hex')
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
