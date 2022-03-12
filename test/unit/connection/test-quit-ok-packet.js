var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.end(function (err) {
    assert.ifError(err);
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('quit', function () {
    conn.ok();
  });
});
