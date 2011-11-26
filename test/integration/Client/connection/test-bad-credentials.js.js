var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
client.password = 'thispassworddoesnotreallywork';

var callbacks = [];
client.query('SELECT 1', function(err) {
  assert.ok(/access denied/i.test(err.message));

  callbacks.push(1);
});

client.query('SELECT 2', function(err) {
  assert.ok(/access denied/i.test(err.message));

  callbacks.push(2);

  client.destroy();
});

process.on('exit', function() {
  assert.deepEqual(callbacks, [1, 2]);
});
