var assert = require('assert');
var common = require('../../common');

var procedureName = 'multipleSelectProcedure';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  var input0 = 1;
  var input1 = 1000;

  connection.query([
    'CREATE PROCEDURE ?? (IN param0 INT, IN param1 INT)',
    'BEGIN',
    'SELECT param0;',
    'SELECT param1;',
    'END'
  ].join('\n'), [procedureName], assert.ifError);

  connection.query('CALL ?? (?,?)', [procedureName, input0, input1], function (err, result) {
    assert.ifError(err);
    assert.deepEqual(result[0], [{param0: input0}], [{param1: input1}]);

    connection.query('DROP PROCEDURE ??', [procedureName], assert.ifError);
    connection.end(assert.ifError);
  });
});
