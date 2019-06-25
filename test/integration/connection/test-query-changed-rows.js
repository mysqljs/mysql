var assert = require('assert');
var common = require('../../common');

var table = 'changed_rows_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query(
    'CREATE TEMPORARY TABLE ?? (`col1` int, `col2` int) ENGINE=InnoDB DEFAULT CHARSET=utf8',
    [table], assert.ifError);

  connection.query('INSERT INTO ?? VALUES(1,1)', [table], assert.ifError);

  connection.query('UPDATE ?? SET `col1` = 2', [table], function (error, results) {
    assert.ifError(error);
    assert.strictEqual(results.affectedRows, 1);
    assert.strictEqual(results.changedRows, 1);

    connection.query('UPDATE ?? SET `col1` = 2', [table], function (error, results) {
      assert.ifError(error);
      assert.strictEqual(results.affectedRows, 1);
      assert.strictEqual(results.changedRows, 0);
      connection.end(assert.ifError);
    });
  });
});
