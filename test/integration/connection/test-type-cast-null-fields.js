var assert = require('assert');
var common = require('../../common');

var table = 'insert_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`date` DATETIME NULL,',
    '`number` INT NULL,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET ?', [table, {
    date   : null,
    number : null
  }]);

  connection.query('SELECT * FROM ??', [table], function (err, results) {
    assert.ifError(err);
    assert.strictEqual(results[0].date, null);
    assert.strictEqual(results[0].number, null);

    connection.end(assert.ifError);
  });
});
