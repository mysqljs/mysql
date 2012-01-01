// @TODO rename growingBuffer -> list
var common     = require('../../../common');
var assert     = require('assert');
var test       = require('utest');
var BufferList = require(common.dir.lib + '/protocol/util/BufferList');

test('BufferList', {
  'push 1 buffer': function() {
    var growingBuffer = new BufferList;
    var buffer        = new Buffer([1, 2, 3]);
    growingBuffer.push(buffer);

    assert.strictEqual(growingBuffer.toBuffer(), buffer);
    assert.equal(growingBuffer.length, buffer.length);
  },

  'push 2 buffers': function() {
    var growingBuffer = new BufferList;
    var buffer1       = new Buffer([1, 2]);
    var buffer2       = new Buffer([3, 4]);

    growingBuffer.push(buffer1);
    assert.equal(growingBuffer.length, buffer1.length);

    growingBuffer.push(buffer2);

    assert.equal(growingBuffer.length, buffer1.length + buffer2.length);
    assert.deepEqual(growingBuffer.toBuffer(), new Buffer([1, 2, 3, 4]));
  },

  '!initialize with buffers': function() {
    var list = new BufferList([new Buffer([1, 2]), new Buffer([3])]);
    assert.equal(list.length, 3);

    assert.deepEqual(list.toBuffer(), new Buffer([1, 2, 3]));
  },
});

