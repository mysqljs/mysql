var assert = require('assert');
var common = require('../../common');

var table = 'escape_id_test';

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

  connection.query('INSERT INTO ?? SET ?? = ?, ?? = ?', [table, 'id', 1, 'example', 'id escape'], assert.ifError);

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {id: 1, example: 'id escape'});

    connection.end(assert.ifError);
  });
});
