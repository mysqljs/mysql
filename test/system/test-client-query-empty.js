require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

// our test db might not exist yet, so don't try to connect to it
client.database = '';
client.connect();

client.query('SELECT "" as field_a', function(err, results) {
  if (err) throw err;

  assert.strictEqual(results[0].field_a, "");
  client.end();
});

