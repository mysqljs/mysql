var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

var results;
connection.query('SELECT 1; SELECT 2', function(err, _results) {
  if (err) throw err;

  results = _results;
});

connection.end();

process.on('exit', function() {
  console.log(results);

  assert.equal(results.length, 2);
  assert.deepEqual(results[0], [{1: 1}]);
  assert.deepEqual(results[1], [{2: 2}]);
});
