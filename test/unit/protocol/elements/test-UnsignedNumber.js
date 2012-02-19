var common         = require('../../../common');
var assert         = require('assert');
var test           = require('utest');
var UnsignedNumber = require(common.dir.lib + '/protocol/elements/UnsignedNumber');

test('UnsignedNumber', {
  '1 byte': function() {
    var uint   = new UnsignedNumber(1, 223);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([223]));
  },

  '4 bytes': function() {
    var uint   = new UnsignedNumber(4, 257);
    var buffer = new Buffer(uint.length);

    uint.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([1, 1, 0, 0]));
  },

  'offset': function() {
    var uint   = new UnsignedNumber(1, 223);
    var buffer = new Buffer([0, 0]);

    uint.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([0, 223]));
  },

  'parse single byte': function() {
    var uint = new UnsignedNumber(1);
    uint.parse(new Buffer([123]), 0, 1);

    assert.equal(uint.value, 123);
  },

  'parse single byte with offset': function() {
    var uint = new UnsignedNumber(1);
    uint.parse(new Buffer([123, 124]), 1);

    assert.equal(uint.value, 124);
  },

  'parse two bytes': function() {
    var uint     = new UnsignedNumber(2);
    var bytes    = [123, 124];
    var expected = Math.pow(256, 0) * bytes[0] + Math.pow(256, 1) * bytes[1];

    uint.parse(new Buffer(bytes), 0, 2);

    assert.equal(uint.value, expected);
  },

  'returns true when filled up': function() {
    var uint = new UnsignedNumber(3);
    var buffer = new Buffer([123, 124]);

    var r = uint.parse(buffer, 0, 1);
    assert.strictEqual(r, false);

    r = uint.parse(buffer, 1, 2);
    assert.strictEqual(r, true);
  },
});
