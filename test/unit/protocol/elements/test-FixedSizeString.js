var common          = require('../../../common');
var assert          = require('assert');
var test            = require('utest');
var FixedSizeString = require(common.dir.lib + '/protocol/elements/FixedSizeString');

test('FixedSizeString', {
  'creates a buffer of the right size': function() {
    var string = new FixedSizeString(10);

    assert.ok(Buffer.isBuffer(string.value));
    assert.equal(string.value.length, 10);
  },

  'parse 1 bytes': function() {
    var string = new FixedSizeString(1);
    var start = string.parse(new Buffer([1]), 0, 1);

    assert.equal(string.isDone(), true);
    assert.equal(string.bytesWritten, 1);
    assert.deepEqual(string.value, new Buffer([1]));
    assert.equal(start, 1);
  },

  'parse 3 bytes': function() {
    var string = new FixedSizeString(3);
    var start = string.parse(new Buffer([1, 2, 3]), 0, 3);

    assert.equal(string.isDone(), true);
    assert.equal(string.bytesWritten, 3);
    assert.deepEqual(string.value, new Buffer([1, 2, 3]));
    assert.equal(start, 3);
  },

  'parse 3 bytes from bigger buffer': function() {
    var string = new FixedSizeString(3);
    var start = string.parse(new Buffer([1, 2, 3, 4]), 0, 4);

    assert.equal(string.isDone(), true);
    assert.equal(string.bytesWritten, 3);
    assert.deepEqual(string.value, new Buffer([1, 2, 3]));
    assert.equal(start, 3);
  },

  'parse 3 bytes individually': function() {
    var string = new FixedSizeString(3);

    var start = string.parse(new Buffer([1]), 0, 1);
    assert.equal(string.isDone(), false);
    assert.equal(string.bytesWritten, 1);
    assert.equal(start, 1);

    var start = string.parse(new Buffer([2]), 0, 1);
    assert.equal(string.isDone(), false);
    assert.equal(string.bytesWritten, 2);
    assert.equal(start, 1);

    var start = string.parse(new Buffer([3]), 0, 1);
    assert.equal(string.isDone(), true);
    assert.equal(string.bytesWritten, 3);
    assert.equal(start, 1);

    assert.deepEqual(string.value, new Buffer([1, 2, 3]));
  },
});

