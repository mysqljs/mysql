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

// https://github.com/felixge/node-mysql/issues/96
test('Timeout reconnect works with empty queue', function() {
  // A non-error packet
  var packet = {};

  // This must not throw an error
  client._handlePacket(packet);
});

test('#format() does not substitute ? in string literals', function() {
  
  // various positions
  // ? '?' ? => 1 '?' 2
  var sql = '? \'? \' ?';		// input
  var exp = '1 \'? \' 2';		// expected output
  var params = [1, 2];			// params
  
  assert.strictEqual(exp, client.format(sql, params));
  
  // trivial test: 
  // '?' => '?' 
  sql = '\'?\'';
  exp = '\'?\'';
  params = [];
  
  assert.strictEqual(exp, client.format(sql, params));
  
  // escaped quote:
  // '? \' ?' ? => '? \' ?' 1
  sql = '\'? \\\' ?\' ?';
  exp = '\'? \\\' ?\' 1';
  params = [1];
  
  assert.strictEqual(exp, client.format(sql, params));
  
});
