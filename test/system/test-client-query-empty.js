require('../common');
var client = require('mysql').Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.query('SELECT "" as field_a', function(err, results) {
  if (err) throw err;

  assert.strictEqual(results[0].field_a, "");
  client.end();
});

