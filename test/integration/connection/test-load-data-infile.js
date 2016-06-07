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
    '`num` varchar(255),',
    '`test_col_1` varchar(255) DEFAULT NULL,',
    '`test_col_2` varchar(255) NOT NULL,',
    '`test_col_3` datetime NOT NULL,',
    '`test_col_4` datetime NOT NULL,',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var sql =
    'LOAD DATA LOCAL INFILE ? INTO TABLE ?? CHARACTER SET utf8 ' +
    'FIELDS TERMINATED BY ? (id, title, num, test_col_1, test_col_2, test_col_3, test_col_4)';

  connection.query(sql, [path, table, ','], function (err, result) {
    assert.ifError(err);
    assert.equal(result.affectedRows, 4);
  });

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].title, 'Hello World');
    assert.equal(rows[0].num, 123.456);
    assert.equal(rows[0].test_col_1, 'test1');
    assert.equal(rows[0].test_col_2, 'test5');

    var testTime = (new Date(2016, 5, 7, 10, 56, 14)).getTime();
    assert.equal(rows[0].test_col_3.getTime(), testTime);
    assert.equal(rows[0].test_col_4.getTime(), testTime);

    assert.equal(rows[3].id, 4);
    assert.equal(rows[3].title, '中文内容');
    assert.equal(rows[3].num, 901.234);
    assert.equal(rows[3].test_col_1, 'test4');
    assert.equal(rows[3].test_col_2, 'test8');
    assert.equal(rows[3].test_col_3.getTime(), testTime);
    assert.equal(rows[3].test_col_4.getTime(), testTime);
  });

  connection.query(sql, [badPath, table, ','], function (err) {
    assert.ok(err);
    assert.equal(err.code, 'ENOENT');
  });

  connection.end(assert.ifError);
});
