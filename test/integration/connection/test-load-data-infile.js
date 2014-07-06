var assert = require('assert');
var common = require('../../common');
var fs     = require('fs');

var badPath = common.fixtures + '/does_not_exist.csv';
var path    = common.fixtures + '/data.csv';
var table   = 'load_data_test';

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

  var sql =
    'LOAD DATA LOCAL INFILE ? INTO TABLE ?? CHARACTER SET utf8 ' +
    'FIELDS TERMINATED BY ? (id, title)';

  connection.query(sql, [path, table, ','], function (err, result) {
    assert.ifError(err);
    assert.equal(result.affectedRows, 4);
  });

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].title, 'Hello World');
    assert.equal(rows[3].id, 4);
    assert.equal(rows[3].title, '中文内容');
  });

  connection.query(sql, [badPath, table, ','], function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ENOENT');
  });

  connection.end(assert.ifError);
});
