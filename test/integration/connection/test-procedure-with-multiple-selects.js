var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
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

connection.query('CALL '+procedureName+'(?,?)', [input0,input1], function(err, _result1, _result2) {
  if (err) throw err;

  result1 = _result1;
  result2 = _result2;
});

connection.query('DROP PROCEDURE '+procedureName);

connection.end();

process.on('exit', function() {
  var result0Expected = {};
  result0Expected[fieldName0] = input0;
  var result1Expected = {};
  result1Expected[fieldName1] = input1;

  var rs0 = new ResultSet();
  var rs1 = new ResultSet();

  rs0.push(result0Expected);
  rs1.push(result1Expected);

  assert.deepEqual(result1, rs0);
  assert.deepEqual(result2, rs1);
  assert(result1.serverInfo);
  assert(result2.serverInfo);
  assert.strictEqual(result1.serverInfo.constructor.name, 'OkPacket');
  assert.strictEqual(result2.serverInfo.constructor.name, 'OkPacket');
  assert.deepEqual(result1.serverInfo, result2.serverInfo);
});
