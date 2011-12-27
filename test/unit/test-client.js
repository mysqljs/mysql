var common    = require('../common');
var assert    = require('assert');
var test      = require('utest');
var Client    = require(common.dir.lib + '/Client');
var SqlString = require(common.dir.lib + '/SqlString');

var client;
test('Client', {
  before: function() {
    client = new Client();
  },

  '#escape is aliased to SqlString.escape': function() {
    assert.strictEqual(client.escape, SqlString.escape);
  },

  '#format is aliased to SqlString.format': function() {
    assert.strictEqual(client.format, SqlString.format);
  },

  'Timeout reconnect works with empty queue': function() {
    // A non-error packet
    var packet = {};
    // This must not throw an error
    client._handlePacket(packet);
  },
});
