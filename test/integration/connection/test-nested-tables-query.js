var assert = require('assert');
var common = require('../../common');

var table = 'nested_test';

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

  connection.query('INSERT INTO ?? SET ?', [table, {title: 'test'}], assert.ifError);

  connection.query({nestTables: true, sql: 'SELECT * FROM ??', values: [table]}, function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].nested_test.id, 1);
    assert.equal(rows[0].nested_test.title, 'test');
  });

  connection.query({nestTables: '_', sql: 'SELECT * FROM ??', values: [table]}, function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].nested_test_id, 1);
    assert.equal(rows[0].nested_test_title, 'test');
  });

  connection.end(assert.ifError);
});
