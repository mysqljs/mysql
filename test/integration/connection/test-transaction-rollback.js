var assert = require('assert');
var common = require('../../common');

var table = 'transaction_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`title` varchar(255),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.beginTransaction(function (err) {
    assert.ifError(err);

    var row = {
      id: 1,
      title: 'Test row'
    };

    connection.query('INSERT INTO ?? SET ?', [table, row], function (err) {
      assert.ifError(err);

      connection.rollback(function  (err) {
        assert.ifError(err);

        connection.query('SELECT * FROM ??', [table], function (err, rows) {
          assert.ifError(err);
          assert.equal(rows.length, 0);
          connection.end(assert.ifError);
        });
      });
    });
  });
});
