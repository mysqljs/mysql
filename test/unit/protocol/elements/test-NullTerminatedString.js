var common               = require('../../../common');
var assert               = require('assert');
var test                 = require('utest');
var NullTerminatedString = require(common.dir.lib + '/protocol/elements/NullTerminatedString');

test('NullTerminatedString', {
  'create from null-terminated buffer': function() {
    var value  = new Buffer([1, 2, 3, 0x00]);
    var string = new NullTerminatedString(null, value);

    assert.strictEqual(string.encoding, null);
    assert.strictEqual(string.value, value);
    assert.equal(string.length, value.length);
  },

  'create ascii string': function() {
    var value  = 'hello world';
    var string = new NullTerminatedString('ascii', value);

    assert.equal(string.encoding, 'ascii');
    assert.strictEqual(string.value, value);
    assert.equal(string.length, value.length + 1);
  },

  'create utf-8 string': function() {
    var value  = 'Öl';
    var string = new NullTerminatedString('utf-8', value);

    assert.equal(string.encoding, 'utf-8');
    assert.strictEqual(string.value, value);
    assert.equal(string.length, Buffer.byteLength(value, 'utf-8') + 1);
  },

  'create empty NullTerminatedString (ascii)': function() {
    var string = new NullTerminatedString('ascii');

    assert.equal(string.encoding, 'ascii');
    assert.strictEqual(string.value, undefined);
    assert.equal(string.length, undefined);
  },

  'create empty NullTerminatedString (no encoding)': function() {
    var string = new NullTerminatedString();

    assert.equal(string.encoding, undefined);
    assert.strictEqual(string.value, undefined);
    assert.equal(string.length, undefined);
  },

  'copy 1 character (ascii)': function() {
    var string = new NullTerminatedString('ascii', 'a');
    var buffer = new Buffer([255, 255]);

    string.copy(buffer, 0);

    // ASCII a = 97
    assert.deepEqual(buffer, new Buffer([97, 0x00]));
  },

  'copy 1 character with offset (ascii)': function() {
    var string = new NullTerminatedString('ascii', 'a');
    var buffer = new Buffer([255, 255, 255]);

    string.copy(buffer, 1);

    assert.deepEqual(buffer, new Buffer([255, 97, 0x00]));
  },

  'copy 1 character (utf-8)': function() {
    var string = new NullTerminatedString('utf-8', 'Ö');
    var buffer = new Buffer([255, 255, 255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0xc3, 0x96, 0x00]));
  },

  'copy 2 character (utf-8)': function() {
    var string = new NullTerminatedString('utf-8', 'Öl');
    var buffer = new Buffer([255, 255, 255, 255]);

    string.copy(buffer, 0);

    assert.deepEqual(buffer, new Buffer([0xc3, 0x96, 0x6c, 0x00]));
  },

  'write 2 characters (utf-8) at once': function() {
    var string = new NullTerminatedString('utf-8');
    var buffer = new Buffer([0x00, 0x00, 0x00, 0x00]);
    buffer.write('Öl', 'utf-8');

    var full = string.write(buffer, 0, buffer.length);
    assert.equal(string.value, 'Öl');
    assert.equal(string.length, 4);
    assert.equal(string.bytesWritten, 4);
    assert.equal(full, true);
  },

  'write 2 characters (utf-8) individually': function() {
    var string = new NullTerminatedString('utf-8');
    var buffer = new Buffer([0x00, 0x00, 0x00, 0x00]);
    buffer.write('Öl', 'utf-8');

    var full = string.write(buffer, 0, 1);
    assert.equal(string.value, '');
    assert.equal(string.length, undefined);
    assert.equal(string.bytesWritten, 1);
    assert.equal(full, false);

    var full = string.write(buffer, 1, 2);
    assert.equal(string.value, 'Ö');
    assert.equal(string.length, undefined);
    assert.equal(string.bytesWritten, 2);
    assert.equal(full, false);

    var full = string.write(buffer, 2, 3);
    assert.equal(string.value, 'Öl');
    assert.equal(string.length, undefined);
    assert.equal(string.bytesWritten, 3);
    assert.equal(full, false);

    var full = string.write(buffer, 3, 4);
    assert.equal(string.value, 'Öl');
    assert.equal(string.length, 4);
    assert.equal(string.bytesWritten, 4);
    assert.equal(full, true);
  },
});

