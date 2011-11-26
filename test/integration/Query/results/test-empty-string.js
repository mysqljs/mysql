var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
var results;
client.query('SELECT "" as field_a', function(err, _results) {
  if (err) throw err;
  results = _results;
  client.destroy();
});

process.on('exit', function() {
  assert.strictEqual(results[0].field_a, "");
});
