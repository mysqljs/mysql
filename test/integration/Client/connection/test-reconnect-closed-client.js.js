var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
var callbacks = [];
client.query('SELECT 1', function(err, results) {
  if (err) throw err;

  callbacks.push(1);
});

client.end(function(err) {
  if (err) throw err;

  callbacks.push(2);
});

client.query('SELECT 1', function(err) {
  if (err) throw err;

  callbacks.push(3);
  client.destroy();
});

process.on('exit', function() {
  assert.deepEqual(callbacks, [1, 2, 3]);
});
