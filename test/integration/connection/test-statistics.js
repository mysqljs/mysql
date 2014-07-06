var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.statistics(function (err, data) {
    assert.ifError(err);
    assert.strictEqual(typeof data, 'object');
    assert.ok(data.hasOwnProperty('message'));
    assert.ok(data.hasOwnProperty('uptime'));
    assert.ok(data.hasOwnProperty('threads'));
    assert.ok(data.hasOwnProperty('questions'));
    assert.ok(data.hasOwnProperty('slow_queries'));
    assert.ok(data.hasOwnProperty('opens'));
    assert.ok(data.hasOwnProperty('flush_tables'));
    assert.ok(data.hasOwnProperty('open_tables'));
    assert.ok(data.hasOwnProperty('queries_per_second_avg'));
    connection.end(assert.ifError);
  });
});
