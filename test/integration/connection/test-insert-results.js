var assert = require('assert');
var common = require('../../common');

var table = 'insert_test';

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

  connection.query('INSERT INTO ?? SET ?', [table, {title: 'test'}], function (err, result) {
    assert.ifError(err);
    assert.strictEqual(result.insertId, 1);

    connection.end(assert.ifError);
  });
});
