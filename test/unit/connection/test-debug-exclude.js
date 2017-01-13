var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({
  debug : ['OkPacket', 'ComPingPacket'],
  port  : common.fakeServerPort
});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var messages = [];

  console.log = function (str) {
    if (typeof str === 'string' && str.length !== 0) {
      messages.push(str);
    }
  };

  connection.ping(function (err) {
    assert.ifError(err);
    assert.equal(messages.length, 3);
    assert.deepEqual(messages, [
      '<-- OkPacket',
      '--> ComPingPacket',
      '<-- OkPacket'
    ]);

    connection.destroy();
    server.destroy();
  });
});
