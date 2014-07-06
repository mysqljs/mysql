var common = require('../../common');
var assert = require('assert');

var table = 'escape_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`example` varchar(255),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET id = ?, example = ?', [table, 1, 'array escape']);
  connection.query('INSERT INTO ?? SET ?', [table, {
    id      : 2,
    example : 'object escape'
  }]);

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {id: 1, example: 'array escape'});
    assert.deepEqual(rows[1], {id: 2, example: 'object escape'});
    connection.end(assert.ifError);
  });
});
