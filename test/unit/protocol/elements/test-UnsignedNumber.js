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
    var offset = uint.parse(new Buffer([123]), 0, 1);

    assert.equal(uint.value, 123);
    assert.equal(offset, 1);
    assert.equal(uint.isDone(), true);
  },

  'parse single byte with offset': function() {
    var uint = new UnsignedNumber(1);
    var offset = uint.parse(new Buffer([123, 124]), 1, 2);

    assert.equal(uint.value, 124);
    assert.equal(offset, 2);
    assert.equal(uint.isDone(), true);
  },

  'parse two bytes': function() {
    var uint     = new UnsignedNumber(2);
    var bytes    = [123, 124];
    var expected = Math.pow(256, 0) * bytes[0] + Math.pow(256, 1) * bytes[1];

    var offset = uint.parse(new Buffer(bytes), 0, 2);

    assert.equal(uint.value, expected);
    assert.equal(offset, 2);
    assert.equal(uint.isDone(), true);
  },

  'handles multiple parse events': function() {
    var uint = new UnsignedNumber(3);
    var buffer = new Buffer([123, 124, 125]);

    var offset = uint.parse(buffer, 0, 1);
    assert.strictEqual(offset, 1);
    assert.equal(uint.isDone(), false);

    offset = uint.parse(buffer, 1, 2);
    assert.strictEqual(offset, 2);
    assert.equal(uint.isDone(), false);

    offset = uint.parse(buffer, 2, 3);
    assert.strictEqual(offset, 3);
    assert.equal(uint.isDone(), true);
  },
});
