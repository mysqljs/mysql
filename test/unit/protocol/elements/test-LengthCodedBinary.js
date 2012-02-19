var common            = require('../../../common');
var assert            = require('assert');
var test              = require('utest');
var LengthCodedBinary = require(common.dir.lib + '/protocol/elements/LengthCodedBinary');

test('LengthCodedBinary', {
  'initialize empty': function() {
    var lengthCodedBinary = new LengthCodedBinary();
    assert.strictEqual(lengthCodedBinary.value, undefined);
    assert.strictEqual(lengthCodedBinary.length, undefined);
  },

  '1 byte for values between 0 - 255': function() {
    var lengthCodedBinary = new LengthCodedBinary(250);
    var buffer            = new Buffer(lengthCodedBinary.length);

    lengthCodedBinary.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([250]));
  },

  'NULL = 251': function() {
    var lengthCodedBinary = new LengthCodedBinary(null);
    var buffer            = new Buffer(lengthCodedBinary.length);

    lengthCodedBinary.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([251]));
  },

  '3 bytes for values > 250 < 2^16': function() {
    var lengthCodedBinary = new LengthCodedBinary(251);
    var buffer            = new Buffer(lengthCodedBinary.length);

    lengthCodedBinary.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([252, 251, 0]));
  },

  '4 bytes for values > 2^16 < 2^24': function() {
    var expected = [5, 6, 7];
    var value    =
        Math.pow(256, 0) * expected[0] +
        Math.pow(256, 1) * expected[1] +
        Math.pow(256, 2) * expected[2]

    var lengthCodedBinary = new LengthCodedBinary(value);
    var buffer            = new Buffer(lengthCodedBinary.length);

    lengthCodedBinary.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([253].concat(expected)));
  },

  '9 bytes for values > 2^24 < 2^53': function() {
    var expected = [1, 2, 3, 4, 5, 6, 7, 0];
    var value    =
        Math.pow(256, 0) * expected[0] +
        Math.pow(256, 1) * expected[1] +
        Math.pow(256, 2) * expected[2] +
        Math.pow(256, 3) * expected[3] +
        Math.pow(256, 4) * expected[4] +
        Math.pow(256, 5) * expected[5] +
        Math.pow(256, 6) * expected[6];
        Math.pow(256, 7) * expected[7];

    var lengthCodedBinary = new LengthCodedBinary(value);
    var buffer            = new Buffer(lengthCodedBinary.length);

    lengthCodedBinary.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([254].concat(expected)));
  },

  'Exception for values >= 53 bit': function() {
    var value = Math.pow(2, 53);

    assert.throws(function() {
      var lengthCodedBinary = new LengthCodedBinary(value);
    }, /LengthCodedBinary.SizeExceeded/);
  },

  'parse 1 byte (0 - 250)': function() {
    var lengthCodedBinary = new LengthCodedBinary();

    var full = lengthCodedBinary.parse(new Buffer([250]), 0, 1);
    assert.equal(lengthCodedBinary.value, 250);
    assert.equal(lengthCodedBinary.bytesWritten, 1);
    assert.equal(lengthCodedBinary.length, 1);
    assert.equal(full, true);
  },

  'parse 1 byte (0 - 250) with offset': function() {
    var lengthCodedBinary = new LengthCodedBinary();

    var full = lengthCodedBinary.parse(new Buffer([0, 220]), 1, 2);
    assert.equal(lengthCodedBinary.value, 220);
    assert.equal(lengthCodedBinary.bytesWritten, 1);
    assert.equal(lengthCodedBinary.length, 1);
    assert.equal(full, true);
  },

  'parse null (251)': function() {
    var lengthCodedBinary = new LengthCodedBinary();

    var full = lengthCodedBinary.parse(new Buffer([251]), 0, 1);
    assert.strictEqual(lengthCodedBinary.value, null);
    assert.equal(lengthCodedBinary.bytesWritten, 1);
    assert.equal(lengthCodedBinary.length, 1);
    assert.equal(full, true);
  },

  'parse 16 bit number': function() {
    var lengthCodedBinary = new LengthCodedBinary();
    var buffer = new Buffer([252, 1, 2]);
    var expected =
        Math.pow(256, 0) * buffer[1] +
        Math.pow(256, 1) * buffer[2];

    var full = lengthCodedBinary.parse(new Buffer(buffer), 0, buffer.length);
    assert.equal(lengthCodedBinary.value, expected);
    assert.equal(lengthCodedBinary.bytesWritten, 3);
    assert.equal(lengthCodedBinary.length, 3);
    assert.equal(full, true);

    return false;
  },

  'parse 24 bit number': function() {
    var lengthCodedBinary = new LengthCodedBinary();
    var buffer = new Buffer([253, 1, 2, 3]);
    var expected =
        Math.pow(256, 0) * buffer[1] +
        Math.pow(256, 1) * buffer[2] +
        Math.pow(256, 2) * buffer[3];

    var full = lengthCodedBinary.parse(new Buffer(buffer), 0, buffer.length);
    assert.equal(lengthCodedBinary.value, expected);
    assert.equal(lengthCodedBinary.bytesWritten, 4);
    assert.equal(lengthCodedBinary.length, 4);
    assert.equal(full, true);

    return false;
  },

  'parse 64 bit number': function() {
    var lengthCodedBinary = new LengthCodedBinary();
    var buffer = new Buffer([254, 8, 7, 6, 5, 4, 3, 2, 0]);
    var expected =
        Math.pow(256, 0) * buffer[1] +
        Math.pow(256, 1) * buffer[2] +
        Math.pow(256, 2) * buffer[3] +
        Math.pow(256, 3) * buffer[4] +
        Math.pow(256, 4) * buffer[5] +
        Math.pow(256, 5) * buffer[6] +
        Math.pow(256, 6) * buffer[7] +
        Math.pow(256, 7) * buffer[8];

    var full = lengthCodedBinary.parse(new Buffer(buffer), 0, buffer.length);
    assert.equal(lengthCodedBinary.value, expected);
    assert.equal(lengthCodedBinary.bytesWritten, 9);
    assert.equal(lengthCodedBinary.length, 9);
    assert.equal(full, true);

    return false;
  },

  'parse 64 bit number exceeding JS precision': function() {
    var lengthCodedBinary = new LengthCodedBinary();
    var buffer = new Buffer([254, 8, 7, 6, 5, 4, 3, 0, 1]);
    var expected =
        Math.pow(256, 0) * buffer[1] +
        Math.pow(256, 1) * buffer[2] +
        Math.pow(256, 2) * buffer[3] +
        Math.pow(256, 3) * buffer[4] +
        Math.pow(256, 4) * buffer[5] +
        Math.pow(256, 5) * buffer[6] +
        Math.pow(256, 6) * buffer[7] +
        Math.pow(256, 7) * buffer[8];

    assert.throws(function() {
      lengthCodedBinary.parse(new Buffer(buffer), 0, buffer.length);
    }, /LengthCodedBinary.SizeExceeded/);

    return false;
  },
});
