var assert = require('assert');
var common = require('../../common');
var util   = require('util');

var tid    = 0;
var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({debug: true, port: server.port()});
  var messages   = [];

  console.log = function () {
    var msg = util.format.apply(this, arguments);
    if (String(msg).indexOf('--') !== -1) {
      messages.push(msg.split(' {')[0]);
    }
  };

  connection.ping(function (err) {
    assert.ifError(err);
    assert.equal(messages.length, 5);
    assert.deepEqual(messages, [
      '<-- HandshakeInitializationPacket',
      '--> (1) ClientAuthenticationPacket',
      '<-- (1) OkPacket',
      '--> (1) ComPingPacket',
      '<-- (1) OkPacket'
    ]);

    connection.destroy();
    server.destroy();
  });
});

server.on('connection', function (conn) {
  conn.handshake({ threadId: ++tid });
});
