var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);
  assert.strictEqual(connection.threadId, null);

  connection.connect(function (err) {
    assert.ok(err);
    assert.strictEqual(err.code, 'ER_ACCESS_DENIED_ERROR');
    assert.strictEqual(connection.threadId, 42);

    server.destroy();
  });
});

server.on('connection', function (incomingConnection) {
  incomingConnection.handshake({threadId: 42});
  incomingConnection.on('clientAuthentication', function () {
    this.deny();
  });
});
