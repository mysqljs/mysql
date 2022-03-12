var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

var connectErr;
server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port : server.port(),
    ssl  : 'Amazon RDS'
  });

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
