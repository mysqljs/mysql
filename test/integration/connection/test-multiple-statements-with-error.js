var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
var connection = common.createConnection({multipleStatements: true});
var assert     = require('assert');

var sql = [
  'SELECT 1',
  'invalid sql',
  'SELECT 2',
].join('; ');

var finishedQueryOne = false;
connection.query(sql, function(err, results) {
  assert.equal(finishedQueryOne, false);
  finishedQueryOne = true;

  var rs0 = new ResultSet();
  rs0.push({1: 1});

  assert.equal(err.code, 'ER_PARSE_ERROR');
  assert.deepEqual(results, rs0);
  assert.equal(results.columns.length, 1);
  assert.equal(results.columns[0].name, '1');
});

var finishedQueryTwo = false;
connection.query('SELECT 3', function(err, results) {
  assert.equal(finishedQueryTwo, false);
  finishedQueryTwo = true;

  var rs0 = new ResultSet();
  rs0.push({3: 3});

  assert.deepEqual(results, rs0);

});

connection.end();

process.on('exit', function() {
  assert.equal(finishedQueryOne, true);
  assert.equal(finishedQueryTwo, true);
});
