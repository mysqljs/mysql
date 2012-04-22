var common = require('../../common');
var test   = require('utest');
var assert = require('assert');
var Parser = require(common.lib + '/protocol/Parser');

function from(bytes) {
  var buffer = new Buffer(bytes);
  var parser = new Parser();

  parser.append(buffer);

  return parser;
}

test('Parser', {
  'parseUnsignedNumber: 1 byte': function() {
    var value = from([5]).parseUnsignedNumber(1);
    assert.equal(value, 5);
  },

  'parseUnsignedNumber: 2 bytes': function() {
    var value = from([1, 1]).parseUnsignedNumber(2);
    assert.equal(value, 256 + 1);
  },
});
