require('../common');
var client = require('mysql').Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.query('SELECT NULL as field_a, NULL as field_b', function(err, results) {
  if (err) throw err;

  assert.strictEqual(results[0].field_a, null);
  assert.strictEqual(results[0].field_b, null);
  client.end();
});

