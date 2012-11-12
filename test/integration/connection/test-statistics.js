var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

var statsErr, statsData;

connection.statistics(function(err, data) {
  statsErr = err;
  statsData = data;
});

connection.end();

process.on('exit', function() {
  assert.equal(statsErr, null);
  assert.strictEqual(typeof statsData, "object");
  assert.strictEqual(statsData.hasOwnProperty("message"), true);
  assert.strictEqual(statsData.hasOwnProperty("uptime"), true);
  assert.strictEqual(statsData.hasOwnProperty("threads"), true);
  assert.strictEqual(statsData.hasOwnProperty("questions"), true);
  assert.strictEqual(statsData.hasOwnProperty("slow_queries"), true);
  assert.strictEqual(statsData.hasOwnProperty("opens"), true);
  assert.strictEqual(statsData.hasOwnProperty("flush_tables"), true);
  assert.strictEqual(statsData.hasOwnProperty("open_tables"), true);
  assert.strictEqual(statsData.hasOwnProperty("queries_per_second_avg"), true);
});
