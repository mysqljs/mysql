var common     = require('../common');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'USE ' + common.testDatabase,
  'SELECT 2',
].join('; ');

var results;
connection.query(sql, function(err, _results) {
  if (err) throw err;

  results = _results;
});

connection.end();

process.on('exit', function() {
  assert.equal(results.length, 3);
  assert.deepEqual(results[0], [{1: 1}]);
  assert.strictEqual(results[1].constructor.name, 'OkPacket');
  assert.deepEqual(results[2], [{2: 2}]);
});
