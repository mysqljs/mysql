var common = require('../../../common');
var assert = require('assert');

var client = common.createClient();
client.query('SELECT 1', function(err, results) {
  if (err) throw err;

  assert.deepEqual(results, [{1: 1}]);

  client.end();
});
