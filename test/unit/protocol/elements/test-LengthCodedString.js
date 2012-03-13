var common            = require('../../../common');
var assert            = require('assert');
var test              = require('utest');
var LengthCodedString = require(common.dir.lib + '/protocol/elements/LengthCodedString');

test('LengthCodedString', {
  'copy: utf8 string with offset': function() {
    var string = new LengthCodedString('utf8', 'Öl');
    var buffer = new Buffer([255, 255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0x03, 0xc3, 0x96, 0x6c, 255]));
  },

  'copy: buffer with offset': function() {
    var string = new LengthCodedString(null, new Buffer('Öl', 'utf-8'));
    var buffer = new Buffer([255, 255, 255, 255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 0x03, 0xc3, 0x96, 0x6c, 255]));
  },

  'parse: utf-8 string with offset': function() {
    var string = new LengthCodedString('utf-8');
    var buffer = new Buffer([255, 0x03, 0xc3, 0x96, 0x6c, 255]);

    var offset = string.parse(buffer, 1, 5);
    assert.equal(string.value, 'Öl');
    assert.equal(offset, 5);
    assert.equal(string.bytesWritten, 4);
    assert.equal(string.isDone(), true);
  },

  'parse: utf-8 string (byte by byte)': function() {
    var string = new LengthCodedString('utf-8');
    var buffer = new Buffer([0x03, 0xc3, 0x96, 0x6c]);

    var offset = string.parse(buffer, 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), false);

    var offset = string.parse(buffer, 1, 2);
    assert.equal(offset, 2);
    assert.equal(string.isDone(), false);

    var offset = string.parse(buffer, 2, 3);
    assert.equal(offset, 3);
    assert.equal(string.isDone(), false);

    var offset = string.parse(buffer, 3, 4);
    assert.equal(offset, 4);
    assert.equal(string.value, 'Öl');
    assert.equal(string.bytesWritten, 4);
    assert.equal(string.isDone(), true);
  },

  'parse: empty string': function() {
    var string = new LengthCodedString('utf-8');
    var buffer = new Buffer([0x00]);

    var offset = string.parse(buffer, 0, 1);
    assert.equal(offset, 1);
    assert.equal(string.isDone(), true);
    assert.equal(string.value, '');
    assert.equal(string.length, 1);
  },
});
