var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.statistics(gently.expect(function statisticsCb(err, statistics) {
  if (err) throw err;

  assert.ok(statistics.extra.match(/time/i));
}));

client.end();
