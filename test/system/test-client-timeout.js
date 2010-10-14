require('../common');
var Client = require('mysql').Client,
    client = new Client(TEST_CONFIG),
    gently = new Gently(),
    timeout = setTimeout(function() {
      throw new Error('MySql timeout did not happen');
    }, 5000);

client.connect();

// Not sure if we need all 3 of these, but they do the trick
client.query('SET interactive_timeout = 1');
client.query('SET wait_timeout = 1');
client.query('SET net_read_timeout = 1');

client._connection.on('end', function() {
  client.query('SELECT 1', gently.expect(function afterTimeoutSelect(err) {
    clearTimeout(timeout);
    assert.ifError(err);
    client.end();
  }));
});
