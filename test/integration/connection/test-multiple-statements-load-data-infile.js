var assert = require('assert');
var common = require('../../common');
var fs     = require('fs');

var path  = common.fixtures + '/data.csv';
var table = 'multi_load_data_test';

common.getTestConnection({multipleStatements: true}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`title` varchar(255),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var stmt =
    'LOAD DATA LOCAL INFILE ? INTO TABLE ?? CHARACTER SET utf8 ' +
    'FIELDS TERMINATED BY ? (id, title)';

  var sql =
    connection.format(stmt, [path, table, ',']) + ';' +
    connection.format(stmt, [path, table, ',']) + ';';

  connection.query(sql, function (err, results) {
    assert.ifError(err);
    assert.equal(results.length, 2);
    assert.equal(results[0].affectedRows, 4);
    assert.equal(results[1].affectedRows, 0);
  });

  connection.query('SELECT * FROM ??', [table], function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].id, 1);
    assert.equal(rows[0].title, 'Hello World');
    assert.equal(rows[3].id, 4);
    assert.equal(rows[3].title, '中文内容');
  });

  connection.end(assert.ifError);
});
