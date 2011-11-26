var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
// Not sure if we need all 3 of these, but they do the trick
client.query('SET interactive_timeout = 1');
client.query('SET wait_timeout = 1');
client.query('SET net_read_timeout = 1');

var result;
client._socket.on('end', function() {
  assert.equal(client.connected, false);

  client.query('SELECT 1', function(err, _result) {
    if (err) throw err;

    result = _result;
    client.destroy();
  });
});

process.on('exit', function() {
  assert.deepEqual(result, [{'1': 1}]);
});
