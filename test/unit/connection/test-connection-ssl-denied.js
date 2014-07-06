var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  port : common.fakeServerPort,
  ssl  : 'Amazon RDS'
});

var server = common.createFakeServer();

var connectErr;
server.listen(common.fakeServerPort, function(err) {
  if (err) throw err;

  connection.connect(function(err) {
    connectErr = err;
    server.destroy();
  });
});

process.on('exit', function() {
  assert.ok(connectErr);
  assert.equal(connectErr.code, 'HANDSHAKE_NO_SSL_SUPPORT');
  assert.ok(connectErr.fatal);
});
