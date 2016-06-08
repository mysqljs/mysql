var assert = require('assert');
var common = require('../../common');
var fs     = require('fs');

var badPath = common.fixtures + '/does_not_exist.csv';
var path    = common.fixtures + '/data.csv';
var table   = 'load_data_test';
var newline = common.detectNewline(path);

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`title` varchar(400),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var sql =
    'LOAD DATA LOCAL INFILE ? INTO TABLE ?? CHARACTER SET utf8 ' +
    'FIELDS TERMINATED BY ? ' +
    'LINES TERMINATED BY ? ' +
    '(id, title)';

  connection.query(sql, [path, table, ',', newline], function (err, result) {
    assert.ifError(err);
    assert.equal(result.affectedRows, 5);
  });

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 5);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].title, 'Hello World');
    assert.equal(rows[3].id, 4);
    assert.equal(rows[3].title, '中文内容');
    assert.equal(rows[4].id, 5);
    assert.equal(rows[4].title.length, 321);
    assert.equal(rows[4].title, 'this is a long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long string');
  });

  connection.query(sql, [badPath, table, ',', newline], function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ENOENT');
  });

  connection.end(assert.ifError);
});
