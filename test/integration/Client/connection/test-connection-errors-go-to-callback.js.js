var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
// Port number outside of range -> triggers connection error
client.port = 999999999;

var callbacks = [];
client.query('SELECT 1', function(err) {
  assert.ok(err);

  callbacks.push(1);
});

client.query('SELECT 2', function(err) {
  assert.ok(err);

  callbacks.push(2);

  client.destroy();
});

process.on('exit', function() {
  assert.deepEqual(callbacks, [1, 2]);
});
