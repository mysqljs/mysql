var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
client.ping(function(err, result) {
  if (err) throw err;

  assert.strictEqual(result.affectedRows, 0);

  client.end();
});
