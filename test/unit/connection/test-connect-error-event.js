var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

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
