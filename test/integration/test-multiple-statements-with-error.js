var common     = require('../common');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'invalid sql',
  'SELECT 2',
].join('; ');

var finishedQueryOne = false;
connection.query(sql, function(err, results, fields) {
  assert.equal(finishedQueryOne, false);
  finishedQueryOne = true;

  assert.equal(err.code, 'ER_PARSE_ERROR');
  assert.deepEqual(results, [[{1: 1}]]);

  assert.equal(fields.length, 1);
  assert.equal(fields[0][0].name, '1');
});

var finishedQueryTwo = false;
connection.query('SELECT 3', function(err, results) {
  assert.equal(finishedQueryTwo, false);
  finishedQueryTwo = true;

  assert.deepEqual(results, [{3: 3}]);
});

connection.end();

process.on('exit', function() {
  assert.equal(finishedQueryOne, true);
  assert.equal(finishedQueryTwo, true);
});
