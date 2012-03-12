var common          = require('../../../common');
var assert          = require('assert');
var test            = require('utest');
var FixedSizeString = require(common.dir.lib + '/protocol/elements/FixedSizeString');

test('FixedSizeString', {
  'constructor: creates a buffer of the right size': function() {
    var string = new FixedSizeString(10);

    assert.ok(Buffer.isBuffer(string.value));
    assert.equal(string.value.length, 10);
    assert.equal(string.length, 10);
  },

  'constructor: creates empty string / sets encoding': function() {
    var string = new FixedSizeString(10, 'utf-8');

    assert.strictEqual(string.value, '');
    assert.equal(string.encoding, 'utf-8');
    assert.equal(string.length, 10);
  },

  'constructor: sets utf-8 value and length properly': function() {
    var string = new FixedSizeString(null, 'utf-8', 'Öl');

    assert.equal(string.value, 'Öl');
    assert.equal(string.encoding, 'utf-8');
    assert.equal(string.length, 3);
  },

  'constructor: sets buffer value and length properly': function() {
    var string = new FixedSizeString(null, null, new Buffer('Öl', 'utf-8'));

    assert.equal(Buffer.isBuffer(string.value), true);
    assert.deepEqual(string.value, new Buffer('Öl', 'utf-8'));
    assert.equal(string.encoding, null);
    assert.equal(string.length, 3);
  },

  'copy: buffer': function() {
    var string = new FixedSizeString(null, null, new Buffer('Öl', 'utf-8'));
    var buffer = new Buffer([255, 255, 255, 255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0xc3, 0x96, 0x6c, 255]));
  },

  'copy: buffer': function() {
    var string = new FixedSizeString(null, null, new Buffer('Öl', 'utf-8'));
    var buffer = new Buffer([255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0xc3, 0x96, 0x6c, 255]));
  },

  'copy: utf-8 string': function() {
    var string = new FixedSizeString(null, 'utf-8', 'Öl');
    var buffer = new Buffer([255, 255, 255, 255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0xc3, 0x96, 0x6c, 255]));
  },

  'copy: utf-8 string with offset': function() {
    var string = new FixedSizeString(null, 'utf-8', 'Öl');
    var buffer = new Buffer([255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0xc3, 0x96, 0x6c, 255]));
  },

  'parse: buffer': function() {
    var string = new FixedSizeString(3);

    var offset = string.parse(new Buffer([1, 2, 3, 4, 5]), 1, 5);
    assert.deepEqual(string.value, new Buffer([2, 3, 4]));
    assert.equal(offset, 4);
    assert.equal(string.isDone(), true);
  },

  'parse: buffer (byte by byte)': function() {
    var string = new FixedSizeString(3);

    var offset = string.parse(new Buffer([1]), 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), false);

    var offset = string.parse(new Buffer([2]), 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), false);

    var offset = string.parse(new Buffer([3]), 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), true);
    assert.deepEqual(string.value, new Buffer([1, 2, 3]));
  },

  'parse: utf8 string': function() {
    var string = new FixedSizeString(3, 'utf-8');

    var offset = string.parse(new Buffer('aÖlb', 'utf-8'), 1, 5);
    assert.deepEqual(string.value, 'Öl');
    assert.equal(offset, 4);
    assert.equal(string.isDone(), true);
  },

  'parse: utf8 string (byte by byte)': function() {
    var string = new FixedSizeString(3, 'utf-8');

    var offset = string.parse(new Buffer('Ö'), 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), false);

    var offset = string.parse(new Buffer('Ö'), 1, 2);
    assert.equal(offset, 2);
    assert.equal(string.isDone(), false);

    var offset = string.parse(new Buffer('l'), 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), true);
    assert.equal(string.value, 'Öl');
  },
});
