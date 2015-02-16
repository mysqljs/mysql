var common = require('../../common');
var assert = require('assert');
var util   = require('util');

var table = 'dates_as_strings';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`dt` DATE,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET ?', [table, {dt: '0000-00-00'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-00-00'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-03-00'}]);
  connection.query('INSERT INTO ?? SET ?', [table, {dt: '2013-03-01'}]);

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].dt, '0000-00-00');
    assert.equal(rows[1].id, 2);
    assert.equal(rows[1].dt, '2013-00-00');
    assert.equal(rows[2].id, 3);
    assert.equal(rows[2].dt, '2013-03-00');
    assert.equal(rows[3].id, 4);
    assert(util.isDate(rows[3].dt));

    connection.end(assert.ifError);
  });
});
