var common = require('../../../common');
var assert = require('assert');
var INVALID_QUERY = 'first invalid #*&% query';

var client    = common.createClient();
var callbacks = [];

client.query(INVALID_QUERY, function(err) {
  assert.strictEqual(err.sql, INVALID_QUERY);
  callbacks.push(1);
});

client.query('SHOW STATUS', function(err, rows, fields) {
  if (err) throw err;

  assert.equal(rows.length >= 50, true);
  assert.equal(Object.keys(fields).length, 2);

  callbacks.push(2);
});

client.query(INVALID_QUERY, function(err) {
  assert.strictEqual(err.sql, INVALID_QUERY);

  callbacks.push(3);
});

client.query(INVALID_QUERY, function(err) {
  assert.strictEqual(err.sql, INVALID_QUERY);

  client.destroy();
  callbacks.push(4);
});

process.on('exit', function() {
  assert.deepEqual(callbacks, [1, 2, 3, 4]);
});
