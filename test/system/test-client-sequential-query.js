require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

// our test db might not exist yet, so don't try to connect to it
client.database = '';
client.connect();

client.query('SELECT 1 as field_a, 2 as field_b', function(err, results) {
  if (err) throw err;

  assert.equal(results[0].field_a, 1);
  assert.equal(results[0].field_b, 2);
});

client.query('SELECT 3 as field_c', function(err, results) {
  if (err) throw err;

  assert.equal(results[0].field_c, 3);
  client.end();
});
