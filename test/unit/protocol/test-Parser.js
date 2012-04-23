var common = require('../../common');
var test   = require('utest');
var assert = require('assert');
var Parser = require(common.lib + '/protocol/Parser');

function packet(bytes) {
  var buffer = new Buffer(bytes);
  var parser = new Parser();

  parser.append(buffer);

  return parser;
}

test('Parser', {
  'parseUnsignedNumber: 1 byte': function() {
    var value = packet([5]).parseUnsignedNumber(1);
    assert.equal(value, 5);
  },

  'parseUnsignedNumber: 2 bytes': function() {
    var value = packet([1, 1]).parseUnsignedNumber(2);
    assert.equal(value, 256 + 1);
  },

  'parseUnsignedNumber: honors offsets': function() {
    var parser = packet([1, 2]);
    assert.equal(parser.parseUnsignedNumber(1), 1);
    assert.equal(parser.parseUnsignedNumber(1), 2);
  },
});
