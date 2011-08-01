var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.query('SELECT "" as field_a', function(err, results) {
  if (err) throw err;

  assert.strictEqual(results[0].field_a, "");
  client.end();
});

