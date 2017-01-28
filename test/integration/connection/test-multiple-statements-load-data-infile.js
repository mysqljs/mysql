var assert = require('assert');
var common = require('../../common');

var path    = common.fixtures + '/data.csv';
var table   = 'multi_load_data_test';
var newline = common.detectNewline(path);

common.getTestConnection({multipleStatements: true}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`title` varchar(400),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var stmt =
    'LOAD DATA LOCAL INFILE ? INTO TABLE ?? CHARACTER SET utf8 ' +
    'FIELDS TERMINATED BY ? ' +
    'LINES TERMINATED BY ? ' +
    '(id, title)';

  var sql =
    connection.format(stmt, [path, table, ',', newline]) + ';' +
    connection.format(stmt, [path, table, ',', newline]) + ';';

  connection.query(sql, function (err, results) {
    assert.ifError(err);
    assert.equal(results.length, 2);
    assert.equal(results[0].affectedRows, 5);
    assert.equal(results[1].affectedRows, 0);
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

  connection.end(assert.ifError);
});
