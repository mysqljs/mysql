var common = require('../../common');
var test   = require('utest');
var assert = require('assert');
var Parser = require(common.lib + '/protocol/Parser');

function packet(bytes) {
  var buffer = new Buffer(bytes);
  var parser = new Parser();

  parser.append(buffer);

  return parser;
}

test('Parser', {
  "parseBuffer: buffer won\'t change after appending another one": function() {
    var startBuffer = new Buffer(5);
    startBuffer.fill('a');

    var parser = new Parser();
    parser.append(startBuffer);

    var value = parser.parseBuffer(4);

    assert.equal(value.toString(), 'aaaa');

    parser.append(new Buffer('b'));

    assert.equal(value.toString(), 'aaaa');
  },

  'parseUnsignedNumber: 1 byte': function() {
    var value = packet([5]).parseUnsignedNumber(1);
    assert.equal(value, 5);
  },

  'parseUnsignedNumber: 2 bytes': function() {
    var value = packet([1, 1]).parseUnsignedNumber(2);
    assert.equal(value, 256 + 1);
  },

  'parseUnsignedNumber: honors offsets': function() {
    var parser = packet([1, 2]);
    assert.equal(parser.parseUnsignedNumber(1), 1);
    assert.equal(parser.parseUnsignedNumber(1), 2);
  },

  'parseLengthCodedNumber: 1 byte': function() {
    var parser = packet([250]);
    assert.strictEqual(parser.parseLengthCodedNumber(), 250);
  },

  'parseLengthCodedNumber: 251 = null': function() {
    var parser = packet([251]);
    assert.strictEqual(parser.parseLengthCodedNumber(), null);
  },

  'parseLengthCodedNumber: 252 = 16 bit': function() {
    var parser = packet([252, 2, 1]);
    var expected =
      2 * Math.pow(256, 0) +
      1 * Math.pow(256, 1);
    assert.strictEqual(parser.parseLengthCodedNumber(), expected);
  },

  'parseLengthCodedNumber: 253 = 24 bit': function() {
    var parser = packet([253, 3, 2, 1]);
    var expected =
      3 * Math.pow(256, 0) +
      2 * Math.pow(256, 1) +
      1 * Math.pow(256, 2);

    assert.strictEqual(parser.parseLengthCodedNumber(), expected);
  },

  'parseLengthCodedNumber: 254 = 64 bit': function() {
    var parser = packet([254, 8, 7, 6, 5, 4, 3, 2, 0]);
    var expected =
      8 * Math.pow(256, 0) +
      7 * Math.pow(256, 1) +
      6 * Math.pow(256, 2) +
      5 * Math.pow(256, 3) +
      4 * Math.pow(256, 4) +
      3 * Math.pow(256, 5) +
      2 * Math.pow(256, 6) +
      0 * Math.pow(256, 7);

    assert.strictEqual(parser.parseLengthCodedNumber(), expected);
  },

  'parseLengthCodedNumber: < 53 bit = no problemo': function() {
    var parser = packet([254, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00]);
    assert.strictEqual(parser.parseLengthCodedNumber(), Math.pow(2, 53) - 1);
  },

  'parseLengthCodedNumber:  53 bit = Error': function() {
    var parser = packet([254, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00]);
    assert.throws(function() {
      parser.parseLengthCodedNumber();
    }, /precision/i);
  },

  'parseLengthCodedNumber: 255 = Error': function() {
    var parser = packet([255]);
    assert.throws(function() {
      parser.parseLengthCodedNumber();
    }, /unexpected/i);
  },

  'parsePacketTerminatedString: regular case': function() {
    var parser = packet([0x48, 0x69]);
    parser._packetEnd = 2;

    var str = parser.parsePacketTerminatedString();
    assert.equal(str, 'Hi');
  },

  'parsePacketTerminatedString: 0x00 terminated': function() {
    var parser = packet([0x48, 0x69, 0x00]);
    parser._packetEnd = 2;

    var str = parser.parsePacketTerminatedString();
    assert.equal(str, 'Hi');
  },
});
