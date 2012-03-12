var common                 = require('../../../common');
var assert                 = require('assert');
var test                   = require('utest');
var PacketTerminatedString = require(common.dir.lib + '/protocol/elements/PacketTerminatedString');

test('PacketTerminatedString', {
  'initialize (ascii)': function() {
    var str    = 'hello';
    var string = new PacketTerminatedString(str, 'ascii');

    assert.equal(string.value, str);
    assert.equal(string.length, str.length);
    assert.equal(string.encoding, 'ascii');
  },

  'initialize (utf-8)': function() {
    var str    = 'Öl';
    var string = new PacketTerminatedString(str, 'utf-8');

    assert.equal(string.value, str);
    assert.equal(string.length, 3);
    assert.equal(string.encoding, 'utf-8');
  },

  'initialize (buffer)': function() {
    var buffer = new Buffer([1, 2, 3]);
    var string = new PacketTerminatedString(buffer);

    assert.strictEqual(string.value, buffer);
    assert.equal(string.length, buffer.length);
    assert.equal(string.encoding, undefined);
  },

  'copy string to buffer (ascii)': function() {
    var str    = 'abc';
    var string = new PacketTerminatedString(str, 'ascii');
    var buffer = new Buffer(str.length);

    string.copy(buffer, 0);
    assert.deepEqual(buffer, new Buffer([0x61, 0x62, 0x63]));
  },

  'copy string to buffer (utf-8)': function() {
    var str    = 'Öl';
    var string = new PacketTerminatedString(str, 'utf-8');
    var buffer = new Buffer(string.length);

    string.copy(buffer, 0);
    assert.deepEqual(buffer, new Buffer([0xc3, 0x96, 0x6c]));
  },

  'copy string to buffer with offset': function() {
    var str    = 'abc';
    var string = new PacketTerminatedString(str, 'ascii');
    var buffer = new Buffer([255, 255, 255, 255]);

    string.copy(buffer, 1);
    assert.deepEqual(buffer, new Buffer([255, 0x61, 0x62, 0x63]));
  },
});
