var common = require('../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();
var timeoutHappened = false;
var timeout = setTimeout(function() {
  if (!timeoutHappened) {
    throw new Error('MySql timeout did not happen');
  }

  gently.verify();
}, 5000);

client.connect();

// Not sure if we need all 3 of these, but they do the trick
client.query('SET interactive_timeout = 1');
client.query('SET wait_timeout = 1');
client.query('SET net_read_timeout = 1');

client._connection.on('end', function() {
  timeoutHappened = true;
  assert.equal(client.connected, false);

  client.query('SELECT 1', gently.expect(function afterTimeoutSelect(err) {
    clearTimeout(timeout);
    assert.ifError(err);
    client.end();
  }));
});
