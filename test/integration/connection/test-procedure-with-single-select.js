var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var procedureName = 'singleSelectProcedure';
var input = 1;
var fieldName = 'param';
var result = undefined;

connection.query([
  'CREATE DEFINER=root@localhost PROCEDURE '+procedureName+'(IN '+fieldName+' INT)',
  'BEGIN',
  'SELECT '+fieldName+';',
  'END'
].join('\n'));

connection.query('CALL '+procedureName+'(?)', [input], function(err, _result) {
  if (err) throw err;
  _result.pop(); // drop metadata
  result = _result;
});

connection.query('DROP PROCEDURE '+procedureName);

connection.end();

process.on('exit', function() {
  var expected = {};
  expected[fieldName] = input;
  assert.deepEqual(result, [[expected]]);
});
