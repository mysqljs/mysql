var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();

client.connect();

client.query('SELECT 1 as field_a, 2 as field_b', function(err, results) {
  if (err) throw err;

  assert.equal(results[0].field_a, 1);
  assert.equal(results[0].field_b, 2);
  client.end();
});
