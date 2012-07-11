var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var procedureName = 'multipleSelectProcedure';
var input0 = 1;
var input1 = 1000;
var fieldName0 = 'param0';
var fieldName1 = 'param1';
var result = undefined;

connection.query([
  'CREATE DEFINER=root@localhost PROCEDURE '+procedureName+'(IN '+fieldName0+' INT, IN '+fieldName1+' INT)',
  'BEGIN',
  'SELECT '+fieldName0+';',
  'SELECT '+fieldName1+';',
  'END'
].join('\n'));

connection.query('CALL '+procedureName+'(?,?)', [input0,input1], function(err, _result) {
  if (err) throw err;

  _result.pop(); // drop metadata
  result = _result;
});

connection.query('DROP PROCEDURE '+procedureName);

connection.end();

process.on('exit', function() {
  var result0Expected = {};
  result0Expected[fieldName0] = input0;
  var result1Expected = {};
  result1Expected[fieldName1] = input1;

  assert.deepEqual(result, [[result0Expected], [result1Expected]]);
});
