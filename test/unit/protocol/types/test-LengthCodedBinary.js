var common             = require('../../../common');
var assert             = require('assert');
var test               = require('utest');
var LengthCodedBinary = require(common.dir.lib + '/protocol/types/LengthCodedBinary');

test('LengthCodedBinary', {
  '1 byte for values between 0 - 255': function() {
    var lengthCodedInteger = new LengthCodedBinary(250);
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([250]));
  },

  'NULL = 251': function() {
    var lengthCodedInteger = new LengthCodedBinary(null);
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([251]));
  },

  '3 bytes for values > 250 < 2^16': function() {
    var lengthCodedInteger = new LengthCodedBinary(251);
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([252, 251, 0]));
  },

  '4 bytes for values > 2^16 < 2^24': function() {
    var expected = [5, 6, 7];
    var value    =
        Math.pow(256, 0) * expected[0] +
        Math.pow(256, 1) * expected[1] +
        Math.pow(256, 2) * expected[2]

    var lengthCodedInteger = new LengthCodedBinary(value);
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

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

    var lengthCodedInteger = new LengthCodedBinary(value);
    var buffer             = new Buffer(lengthCodedInteger.length);

    lengthCodedInteger.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([254].concat(expected)));
  },

  'Exception for values >= 53 bit': function() {
    var value = Math.pow(2, 53);

    assert.throws(function() {
      var lengthCodedInteger = new LengthCodedBinary(value);
    }, /LengthCodedBinary.SizeExceeded/);
  },
});
