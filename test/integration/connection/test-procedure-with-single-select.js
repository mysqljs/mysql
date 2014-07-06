var assert = require('assert');
var common = require('../../common');

var procedureName = 'singleSelectProcedure';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  var input = 1;

  connection.query([
    'CREATE DEFINER=root@localhost PROCEDURE ?? (IN param INT)',
    'BEGIN',
    'SELECT param;',
    'END'
  ].join('\n'), [procedureName], assert.ifError);

  connection.query('CALL ?? (?)', [procedureName, input], function (err, result) {
    assert.ifError(err);
    assert.deepEqual(result[0], [{param: input}]);

    connection.query('DROP PROCEDURE ??', [procedureName], assert.ifError);
    connection.end(assert.ifError);
  });
});
