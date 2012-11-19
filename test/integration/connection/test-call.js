var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var procedure = 'call_test';

connection.query([
  'CREATE PROCEDURE `' + procedure + '` (',
  'IN `val` int(11),',
  'OUT `dup` int(11))',
  'BEGIN',
  ' SET `dup` = `val` * 2;',
  'END'
].join('\n'));

connection.call(procedure + "(10, @double)", function (err, data) {
  assert.equal(err, null);
  assert.deepEqual(data, { double: 20 });

  connection.query("DROP PROCEDURE `" + procedure + "`");
  connection.end();
});
