var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.query('SELECT NULL as field_a, NULL as field_b', function(err, results) {
  if (err) throw err;

  assert.strictEqual(results[0].field_a, null);
  assert.strictEqual(results[0].field_b, null);
  client.end();
});

