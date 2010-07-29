require('../common');
var EventEmitter = require('events').EventEmitter
  , Parser = require('mysql/parser')
  , parser
  , gently;

function test(test) {
  parser = new Parser();
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.strictEqual(parser.state, Parser.IDLE);
  assert.strictEqual(parser.packet, null);
  assert.strictEqual(parser.greeted, false);
  assert.ok(parser instanceof EventEmitter);
});

test(function write() {
  var packet;
  (function testPacketLength() {
    parser.write(new Buffer([1]));

    assert.equal(parser.state, Parser.PACKET_LENGTH);

    packet = parser.packet;
    assert.ok(packet instanceof EventEmitter);
    assert.strictEqual(packet.number, 0);
    assert.strictEqual(packet.length, 1);

    parser.write(new Buffer([2]));
    parser.write(new Buffer([3]));
    assert.strictEqual
      ( packet.length
      , Math.pow(256, 0) * 1 + Math.pow(256, 1) * 2 + Math.pow(256, 2) * 3
      );
  })();

  (function testPacketSize() {
    parser.write(new Buffer([42]));
    assert.strictEqual(packet.number, 42);
    assert.strictEqual(packet.number, 42);
    assert.equal(packet.type, Parser.GREETING_PACKET);
    assert.equal(parser.state, Parser.GREETING_PROTOCOL_VERSION);
  })();

  (function testGreeting() {
    parser.write(new Buffer([15]));
    assert.equal(packet.protocolVersion, 15);
    assert.equal(parser.state, Parser.GREETING_SERVER_VERSION);

    var VERSION = 'MySql 5.1';
    parser.write(new Buffer(VERSION+'\0'));
    assert.equal(packet.serverVersion, VERSION);
    assert.equal(parser.state, Parser.GREETING_THREAD_ID);

    parser.write(new Buffer([0, 0, 0, 1]));
    assert.equal(packet.threadId, Math.pow(256, 3));

    parser.write(new Buffer([1]));
    assert.equal(packet.scrambleBuff[0], 1);
    assert.equal(packet.scrambleBuff.length, 8 + 13);
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_1);

    parser.write(new Buffer([2, 3, 4, 5, 6, 7, 8]));
    assert.deepEqual
      ( packet.scrambleBuff.slice(0, 8)
      , new Buffer([1, 2, 3, 4, 5, 6, 7, 8])
      );
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_1);

    parser.write(new Buffer([0]));
    assert.equal(parser.state, Parser.GREETING_SERVER_CAPABILITIES);

    parser.write(new Buffer([0, 1]));
    assert.equal(packet.serverCapabilities, Math.pow(256, 1));

    parser.write(new Buffer([17]));
    assert.equal(packet.serverLanguage, 17);
    assert.equal(parser.state, Parser.GREETING_SERVER_STATUS);

    parser.write(new Buffer([0, 1]));
    assert.equal(packet.serverStatus, Math.pow(256, 1));

    parser.write(new Buffer([0]));
    assert.equal(parser.state, Parser.GREETING_FILLER_2);
    parser.write(new Buffer(12));
    assert.equal(parser.state, Parser.GREETING_FILLER_2);

    parser.write(new Buffer([9]));
    assert.equal(packet.scrambleBuff[8], 9);
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_2);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.ok(!('index' in packet));
      assert.strictEqual(val, packet);
      assert.equal(parser.state, Parser.IDLE);
      assert.equal(parser.greeted, true);
    });

    parser.write(new Buffer([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]));
    assert.deepEqual
      ( packet.scrambleBuff.slice(9, 21)
      , new Buffer([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
      );
  })();
});