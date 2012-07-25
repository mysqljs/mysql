var common     = require('../../common');
var connection = common.createConnection({
  port         : common.fakeServerPort,
  password     : 'oldpw',
  insecureAuth : true,
});
var assert     = require('assert');

var server = common.createFakeServer();

var connected;
server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.connect(function(err, result) {
    if (err) throw err;

    connected = result;

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function(incomingConnection) {
  incomingConnection.handshake({
    user        : connection.config.user,
    password    : connection.config.password,
    oldPassword : true,
  });
});

process.on('exit', function() {
  assert.equal(connected.fieldCount, 0);
});
