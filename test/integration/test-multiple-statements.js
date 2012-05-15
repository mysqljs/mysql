var common     = require('../common');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'USE ' + common.testDatabase,
  'SELECT 2',
].join('; ');

var results;
var fields;
connection.query(sql, function(err, _results, _fields) {
  if (err) throw err;

  results = _results;
  fields = _fields;
});

connection.end();

process.on('exit', function() {
  assert.equal(results.length, 3);
  assert.deepEqual(results[0], [{1: 1}]);
  assert.strictEqual(results[1].constructor.name, 'OkPacket');
  assert.deepEqual(results[2], [{2: 2}]);

  assert.equal(fields[0][0].name, '1');
  assert.equal(fields[1], undefined);
  assert.equal(fields[2][0].name, '2');
});
