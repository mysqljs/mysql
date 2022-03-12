var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.connect();

  connection.on('error', function (err) {
    assert.equal(err.code, 'ER_ACCESS_DENIED_ERROR');
    assert.ok(err.fatal);

    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.deny();
});
