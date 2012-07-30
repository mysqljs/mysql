var common     = require('../../common');
var ResultSet     = require('../../../lib/protocol/ResultSet');
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
  result = _result;
});

connection.query('DROP PROCEDURE '+procedureName);

connection.end();

process.on('exit', function() {
  var expected = {};
  expected[fieldName] = input;

  var rs0 = new ResultSet();
  rs0.push(expected);

  assert.deepEqual(result, rs0);
  assert.equal(result.columns[0].name, fieldName);
});
