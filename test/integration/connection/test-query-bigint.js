var assert = require('assert');
var common = require('../../common');

var table = 'bigint_test';

common.getTestConnection({supportBigNumbers: true}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`big` bigint,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET ?', [table, {big: '9223372036854775807'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {big: '-9223372036854775807'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {big: '1111111111111111111'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {big: '-1111111111111111111'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {big: '9007199254740993'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {big: '-9007199254740993'}]);

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 6);
    assert.strictEqual(rows[0].big, '9223372036854775807');
    assert.strictEqual(rows[1].big, '-9223372036854775807');
    assert.strictEqual(rows[2].big, '1111111111111111111');
    assert.strictEqual(rows[3].big, '-1111111111111111111');
    assert.strictEqual(rows[4].big, '9007199254740993');
    assert.strictEqual(rows[5].big, '-9007199254740993');
    connection.end(assert.ifError);
  });
});
