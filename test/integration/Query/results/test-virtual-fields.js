var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
var results;
client.query('SELECT 1 as field_a, 2 as field_b', function(err, _results) {
  if (err) throw err;

  results = _results;
  client.destroy();
});

process.on('exit', function() {
  assert.equal(results[0].field_a, 1);
  assert.equal(results[0].field_b, 2);
});
