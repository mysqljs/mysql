require('../common');
var EventEmitter = require('events').EventEmitter,
    Parser = require('mysql/parser'),
    parser,
    gently;

function test(test) {
  parser = new Parser();
  gently = new Gently();
  test();
  gently.verify(test.name);
}

test(function constructor() {
  assert.strictEqual(parser.state, Parser.PACKET_LENGTH);
  assert.strictEqual(parser.packet, null);
  assert.strictEqual(parser.greeted, false);
  assert.ok(parser instanceof EventEmitter);
});

test(function write() {
  var packet;
  (function testPacketLength() {
    var LENGTH = 56;
    parser.write(new Buffer([LENGTH]));

    assert.equal(parser.state, Parser.PACKET_LENGTH);

    packet = parser.packet;

    assert.ok(packet instanceof EventEmitter);
    assert.strictEqual(packet.number, 0);
    assert.strictEqual(packet.length, LENGTH);

    parser.write(new Buffer([0]));
    parser.write(new Buffer([0]));
    assert.strictEqual(
      packet.length,
      Math.pow(256, 0) * LENGTH + Math.pow(256, 1) * 0 + Math.pow(256, 2) * 0
    );
  })();

  (function testPacketSize() {
    parser.write(new Buffer([42]));
    assert.strictEqual(packet.number, 42);
    assert.equal(parser.state, Parser.GREETING_PROTOCOL_VERSION);
  })();

  (function testGreetingPacket() {
    parser.write(new Buffer([15]));
    assert.equal(packet.type, Parser.GREETING_PACKET);
    assert.equal(packet.protocolVersion, 15);
    assert.equal(parser.state, Parser.GREETING_SERVER_VERSION);

    var VERSION = 'MySql 5.1';
    parser.write(new Buffer(VERSION+'\0'));
    assert.equal(packet.serverVersion, VERSION);
    assert.equal(parser.state, Parser.GREETING_THREAD_ID);

    parser.write(new Buffer([0, 0, 0, 1]));
    assert.equal(packet.threadId, Math.pow(256, 3));

    parser.write(new Buffer([1]));
    assert.equal(packet.scrambleBuffer[0], 1);
    assert.equal(packet.scrambleBuffer.length, 8 + 12);
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_1);

    parser.write(new Buffer([2, 3, 4, 5, 6, 7, 8]));
    assert.deepEqual(
      packet.scrambleBuffer.slice(0, 8),
      new Buffer([1, 2, 3, 4, 5, 6, 7, 8])
    );
    assert.equal(parser.state, Parser.GREETING_FILLER_1);

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
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_2);

    parser.write(new Buffer([9]));
    assert.equal(packet.scrambleBuffer[8], 9);
    assert.equal(parser.state, Parser.GREETING_SCRAMBLE_BUFF_2);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.ok(!('index' in val));
      assert.strictEqual(val, packet);
      assert.equal(parser.state, Parser.PACKET_LENGTH);
      assert.equal(parser.greeted, true);
    });

    parser.write(new Buffer([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 0]));
    assert.deepEqual(
      packet.scrambleBuffer.slice(9, 20),
      new Buffer([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    );
    assert.strictEqual(parser.packet, null);
  })();

  (function testErrorPacket() {
    parser.write(new Buffer([12, 0, 0, 1]));
    assert.equal(parser.state, Parser.FIELD_COUNT);
    var packet = parser.packet;

    parser.write(new Buffer([0xff]));
    assert.equal(packet.type, Parser.ERROR_PACKET);
    assert.equal(parser.state, Parser.ERROR_NUMBER);

    parser.write(new Buffer([5, 2]));
    assert.equal(packet.errorNumber, Math.pow(256, 0) * 5 + Math.pow(256, 1) * 2);

    parser.write(new Buffer('#'));
    assert.equal(packet.sqlStateMarker, '#');
    assert.equal(parser.state, Parser.ERROR_SQL_STATE);

    parser.write(new Buffer('abcde'));
    assert.equal(packet.sqlState, 'abcde');

    parser.write(new Buffer('er'));
    assert.equal(parser.state, Parser.ERROR_MESSAGE);
    assert.equal(packet.errorMessage, 'er');

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(packet.errorMessage, 'err');
    });

    parser.write(new Buffer('r'));
  })();

  (function testOkPacket() {
    parser.state = Parser.PACKET_LENGTH;

    parser.write(new Buffer([13, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([0x00]));
    assert.equal(packet.type, Parser.OK_PACKET);
    assert.equal(parser.state, Parser.AFFECTED_ROWS);

    parser.write(new Buffer([252, 17, 23]));
    assert.equal(packet.affectedRows, Math.pow(256, 0) * 17 + Math.pow(256, 1) * 23);

    parser.write(new Buffer([240]));
    assert.equal(packet.insertId, 240);

    parser.write(new Buffer([42, 113]));
    assert.equal(packet.serverStatus, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(packet.message, 'abcdef');
    });

    parser.write(new Buffer('abcdef'));
  })();

  (function testResultHeaderPacket() {
    parser.state = Parser.PACKET_LENGTH;

    parser.write(new Buffer([1, 0, 0, 1]));
    var packet = parser.packet;

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(val.type, Parser.RESULT_SET_HEADER_PACKET);
      assert.equal(val.fieldCount, 5);
    });

    parser.write(new Buffer([5]));
  })();

  (function testResultHeaderPacketWithExtra() {
    parser.state = Parser.PACKET_LENGTH;

    parser.write(new Buffer([2, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([23]));
    assert.equal(parser.state, Parser.EXTRA);
    assert.equal(packet.fieldCount, 23);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(val.type, Parser.RESULT_SET_HEADER_PACKET);
      assert.equal(val.extra, 51);
    });

    parser.write(new Buffer([51]));
  })();
});
