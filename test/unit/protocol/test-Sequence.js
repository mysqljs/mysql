var common = require('../../common');
var test   = require('utest');
var assert = require('assert');
var Sequence = common.Sequence;

test('Sequence', {
  '_packetToError: returns an error': function() {
    var sequence = new Sequence();
    var packet = {
      errno    : 1644,
      message  : '',
      sqlState : ''
    };
    var result = sequence._packetToError(packet);
    assert.ok(result instanceof Error, 'returns an Error');
  },
  '_packetToError: sets properties correctly': function() {
    var sequence = new Sequence();
    var packet = {
      errno    : 1644,
      message  : 'test message',
      sqlState : '45000'
    };
    var expectedCode = common.Errors['1644'];
    var result = sequence._packetToError(packet);
    assert.equal(result.code, expectedCode, 'sets "code" correctly');
    assert.equal(result.errno, packet.errno, 'sets "errno" correctly');
    assert.equal(result.sqlMessage, packet.message,
                 'sets "message" correctly');
    assert.equal(result.sqlState, packet.sqlState,
                 'sets "sqlState" correctly');
  },
  '_packetToError: sets unknown code when not found in constants': function() {
    var sequence = new Sequence();
    var packet = {
      errno    : 0,
      message  : '',
      sqlState : ''
    };
    var expectedCode = 'UNKNOWN_CODE_PLEASE_REPORT';
    var result = sequence._packetToError(packet);
    assert.equal(result.code, expectedCode,
                 'assigns "code" correctly when unknown');
  }
});
