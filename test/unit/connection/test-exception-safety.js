// This test covers all event / callback interfaces offered by node-mysql and
// throws an exception in them. Exception safety means that each of those
// exceptions can be caught by an 'uncaughtException' / Domain handler without
// the connection instance ending up in a bad state where it doesn't work
// properly or doesn't execute the next sequence anymore.

var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});
var server     = common.createFakeServer();

server.listen(common.fakeServerPort, function(err) {
  assert.ifError(err);

  var errors = [];
  process.on('uncaughtException', function(err) {
    errors.push(err);
  });

  // Normal callback
  connection.connect(function(err) {
    throw err || new Error('1');
  });

  // Normal callback (same code path as connect, but in here should that
  // implementation detail change at some point).
  connection.query('SELECT 1', function(err) {
    throw err || new Error('2');
  });

  // Row streaming events
  connection.query('SELECT 1')
  .on('fields', function() {
    throw new Error('3');
  })
  .on('result', function() {
    throw new Error('4');
  });

  // Normal callback with error
  connection.query('INVALID SQL', function(err) {
    assert.equal(err.code, 'ER_PARSE_ERROR');
    throw new Error('5');
  });

  // Row streaming 'result' event triggered by Ok Packet (special code path)
  connection.query('USE test')
  .on('result', function() {
    throw new Error('6');
  });

  // Normal callback (same code path as connect, but in here should that
  // implementation detail change at some point).
  connection.end(function(err) {
    server.destroy();
    throw err || new Error('7');
  });

  process.on('exit', function() {
    process.removeAllListeners();

    var expectedErrors = 7;
    for (var i = 0; i < expectedErrors - 1; i++) {
      var error = errors[i];
      assert.equal(error.message, String(i + 1));
      assert.equal(error.code, undefined);
    }
  });
});

server.on('connection', function (conn) {
  conn.handshake();
  conn.on('query', function(packet) {
    switch (packet.sql) {
      case 'INVALID SQL':
        this._sendPacket(new common.Packets.ErrorPacket({
          errno   : common.Errors.ER_PARSE_ERROR,
          message : 'Parse error'
        }));
        this._parser.resetPacketNumber();
        break;
      case 'USE test':
        this._sendPacket(new common.Packets.OkPacket());
        this._parser.resetPacketNumber();
        break;
      default:
        this._handleQueryPacket(packet);
        break;
    }
  });
});
