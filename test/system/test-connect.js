require('../common');
var client = require('mysql').Client(TEST_CONFIG)
  , gently = new Gently();

// our test db does not exist yet, so don't try to connect to it
client.database = '';

client.connect(gently.expect(function connectCb(err, result) {
  if (err) throw err;

  assert.strictEqual(result.affectedRows, 0);
  client.end();
}));