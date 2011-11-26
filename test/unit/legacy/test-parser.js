var common = require('./common');
var EventEmitter = require('events').EventEmitter,
    Parser = require(common.dir.lib + '/parser'),
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
  assert.strictEqual(parser.authenticated, false);
  assert.strictEqual(parser.receivingFieldPackets, false);
  assert.strictEqual(parser.receivingRowPackets, false);
  assert.strictEqual(parser._lengthCodedLength, null);
  assert.strictEqual(parser._lengthCodedStringLength, null);
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

  (function testPacketNumber() {
    parser.write(new Buffer([42]));
    assert.strictEqual(packet.number, 42);
    assert.equal(parser.state, Parser.GREETING_PROTOCOL_VERSION);
  })();

  (function testGreetingErrorPacket() {
    parser.write(new Buffer([0xff]));
    assert.equal(packet.type, Parser.ERROR_PACKET);
    assert.equal(parser.state, Parser.ERROR_NUMBER);

    parser.write(new Buffer([5, 2]));
    assert.equal(packet.errorNumber, Math.pow(256, 0) * 5 + Math.pow(256, 1) * 2);

    parser.write(new Buffer('Hello World'));
    assert.equal(packet.errorMessage, 'Hello World');

    // Reset back to previous state
    packet.type = Parser.GREETING_PACKET;
    packet.received = 0;
    parser.state = Parser.GREETING_PROTOCOL_VERSION;
  })();

  (function testGreetingPacket() {
    parser.write(new Buffer([15]));
    assert.equal(packet.type, Parser.GREETING_PACKET);
    assert.equal(packet.protocolVersion, 15);
    assert.equal(parser.state, Parser.GREETING_SERVER_VERSION);

    var VERSION = 'MySql 5.1';
    parser.write(new Buffer(VERSION+'\0', 'binary'));
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

  (function testUseOldPasswordProtocolPacket() {
    parser.write(new Buffer([1, 0, 0, 1]));

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(val.type, Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET);
    });

    parser.write(new Buffer([254]));
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
    parser.write(new Buffer([15, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([0x00]));
    assert.equal(packet.type, Parser.OK_PACKET);
    assert.equal(parser.authenticated, true);
    assert.equal(parser.state, Parser.AFFECTED_ROWS);

    parser.write(new Buffer([252, 17, 23]));
    assert.equal(packet.affectedRows, Math.pow(256, 0) * 17 + Math.pow(256, 1) * 23);

    parser.write(new Buffer([240]));
    assert.equal(packet.insertId, 240);

    parser.write(new Buffer([42, 113]));
    assert.equal(packet.serverStatus, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);

    parser.write(new Buffer([32, 153]));
    assert.equal(packet.warningCount, Math.pow(256, 0) * 32 + Math.pow(256, 1) * 153);

    assert.strictEqual(packet.message, '');

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(packet.message, 'abcdef');
    });

    parser.write(new Buffer('abcdef'));
  })();

  (function testResultHeaderPacket() {
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
    parser.receivingFieldPackets = false;

    parser.write(new Buffer([5, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([23]));
    assert.equal(parser.state, Parser.EXTRA_LENGTH);
    assert.equal(packet.fieldCount, 23);

    parser.write(new Buffer([3]));

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(val.type, Parser.RESULT_SET_HEADER_PACKET);
      assert.equal(val.extra, 'abc');
    });

    parser.write(new Buffer('abc'));
  })();

  (function testFieldPacket() {
    parser.write(new Buffer([43, 0, 0, 1]));
    var packet = parser.packet;

    assert.equal(parser.state, Parser.FIELD_CATALOG_LENGTH);
    parser.write(new Buffer([3]));
    assert.equal(packet.type, Parser.FIELD_PACKET);
    parser.write(new Buffer('abc'));
    assert.equal(packet.catalog, 'abc');

    assert.equal(parser.state, Parser.FIELD_DB_LENGTH);
    parser.write(new Buffer([5]));
    parser.write(new Buffer('hello'));
    assert.equal(packet.db, 'hello');

    assert.equal(parser.state, Parser.FIELD_TABLE_LENGTH);
    parser.write(new Buffer([2]));
    parser.write(new Buffer('ab'));
    assert.equal(packet.table, 'ab');

    assert.equal(parser.state, Parser.FIELD_ORIGINAL_TABLE_LENGTH);
    parser.write(new Buffer([4]));
    parser.write(new Buffer('1234'));
    assert.equal(packet.originalTable, '1234');

    assert.equal(parser.state, Parser.FIELD_NAME_LENGTH);
    parser.write(new Buffer([1]));
    parser.write(new Buffer('o'));
    assert.equal(packet.name, 'o');

    assert.equal(parser.state, Parser.FIELD_ORIGINAL_NAME_LENGTH);
    parser.write(new Buffer([9]));
    parser.write(new Buffer('wonderful'));
    assert.equal(packet.originalName, 'wonderful');

    assert.equal(parser.state, Parser.FIELD_FILLER_1);
    parser.write(new Buffer([0]));

    assert.equal(parser.state, Parser.FIELD_CHARSET_NR);
    parser.write(new Buffer([42, 113]));
    assert.equal(packet.charsetNumber, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);

    assert.equal(parser.state, Parser.FIELD_LENGTH);
    parser.write(new Buffer([42, 113, 50, 30]));
    assert.equal(packet.fieldLength, 42 + (256 * 113) + (256 * 256) * 50 + (256 * 256 * 256 * 30));

    assert.equal(parser.state, Parser.FIELD_TYPE);
    parser.write(new Buffer([58]));
    assert.equal(packet.fieldType, 58);

    assert.equal(parser.state, Parser.FIELD_FLAGS);
    parser.write(new Buffer([42, 113]));
    assert.equal(packet.flags, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);

    assert.equal(parser.state, Parser.FIELD_DECIMALS);
    parser.write(new Buffer([58]));
    assert.equal(packet.decimals, 58);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
    });

    assert.equal(parser.state, Parser.FIELD_FILLER_2);
    parser.write(new Buffer([0, 0]));
  })();

  (function testEofPacket() {
    parser.write(new Buffer([5, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([0xfe]));
    assert.equal(packet.type, Parser.EOF_PACKET);

    assert.equal(parser.state, Parser.EOF_WARNING_COUNT);
    parser.write(new Buffer([42, 113]));
    assert.equal(packet.warningCount, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
      assert.equal(parser.receivingFieldPackets, false);
      assert.equal(parser.receivingRowPackets, true);
    });

    assert.equal(parser.state, Parser.EOF_SERVER_STATUS);
    parser.write(new Buffer([42, 113]));
    assert.equal(packet.serverStatus, Math.pow(256, 0) * 42 + Math.pow(256, 1) * 113);
  })();

  (function testRowPacket() {
    parser.write(new Buffer([23, 0, 0, 1]));
    var packet = parser.packet;

    gently.expect(parser, 'emit', function(event, val) {
      assert.equal(event, 'packet');
    });

    parser.write(new Buffer([16]));
    assert.equal(parser.state, Parser.COLUMN_VALUE_STRING);
    assert.equal(packet.type, Parser.ROW_DATA_PACKET);
    assert.equal(packet.columnLength, 16);

    gently.expect(packet, 'emit', function(event, val, remaining) {
      assert.equal(event, 'data');
      assert.equal(val.toString(), 'hi, ');
      assert.equal(remaining, 12);
    });

    parser.write(new Buffer('hi, '));

    gently.expect(packet, 'emit', function(event, val, remaining) {
      assert.equal(event, 'data');
      assert.equal(val.toString(), 'how');
      assert.equal(remaining, 9);
    });

    parser.write(new Buffer('how'));

    gently.expect(packet, 'emit', function(event, val, remaining) {
      assert.equal(event, 'data');
      assert.equal(val.toString(), ' are you?');
      assert.equal(remaining, 0);
    });

    gently.expect(packet, 'emit', function(event, val, remaining) {
      assert.equal(event, 'data');
      assert.equal(val.toString(), 'Fine!');
      assert.equal(remaining, 0);
      assert.equal(packet.index, 0);
    });

    parser.write(new Buffer(' are you?\u0005Fine!'));

    assert.equal(parser.packet, null);
    assert.equal(parser.state, Parser.PACKET_LENGTH);
  })();

  (function testEofPacketAfterRowPacket() {
    parser.write(new Buffer([5, 0, 0, 1]));
    var packet = parser.packet;

    parser.write(new Buffer([0xfe]));
    assert.equal(packet.type, Parser.EOF_PACKET);
    assert.equal(parser.receivingRowPackets, false);
  })();
});
