var assert = require('assert');
var common = require('../../common');

var table = 'custom_typecast_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(5),',
    '`val` tinyint(1)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? VALUES (1, 0), (2, 1), (3, NULL)', [table], assert.ifError);

  connection.query({
    sql: 'SELECT * FROM ??',
    values: [table],
    typeCast: function (field, next) {
      if (field.type != 'TINY') {
        return next();
      }

      var val = field.string();

      if (val === null) {
        return null;
      }

      return (Number(val) > 0);
    }
  }, function (err, results) {
    assert.ifError(err);
    assert.equal(results.length, 3);
    assert.deepEqual(results[0], {id: 1, val: false});
    assert.deepEqual(results[1], {id: 2, val: true});
    assert.deepEqual(results[2], {id: 3, val: null});
    connection.end(assert.ifError);
  });
});
