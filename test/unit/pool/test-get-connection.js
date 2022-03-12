var common     = require('../../common');
var assert     = require('assert');
var Connection = common.Connection;

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.getConnection(function (err, connection) {
    assert.ifError(err);
    assert.ok(connection instanceof Connection);

    connection.destroy();
    server.destroy();
  });
});
