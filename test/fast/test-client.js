var common = require('../common');
var assert = require('assert');
var test = common.fastOrSlow.fast();
var Client = require(common.dir.lib + '/client');

var client;
test.before(function() {
  client = new Client();
});

test('#format() does not manipulate params parameter', function() {
  var sql = '?';
  var params = [1];

  client.format(sql, params);
  assert.equal(params.length, 1);
});

test('#format() does not quote floats', function() {
  var params = [1.23];

  var sql = client.format('?', params);
  assert.strictEqual(sql, '1.23');
});

test('#format() quotes individual array values and combines them with commas', function() {
  var params = [ [ 6.23, 'something', true, null ] ];

  var sql = client.format('?', params);
  assert.strictEqual(sql, "6.23,'something',true,NULL");
});

// https://github.com/felixge/node-mysql/issues/96
test('Timeout reconnect works with empty queue', function() {
  // A non-error packet
  var packet = {};

  // This must not throw an error
  client._handlePacket(packet);
});
