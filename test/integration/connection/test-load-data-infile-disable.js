var assert = require('assert');
var common = require('../../common');

var path    = common.fixtures + '/data.csv';
var table   = 'load_data_test';
var newline = common.detectNewline(path);

common.getTestConnection({localInfile: false}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  // only test result if server permits local infile
  connection.query("SELECT @@local_infile", function (err, rows) {
    assert.ifError(err);
    if (rows[0]['@@local_infile'] === 1) {
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

      connection.query(sql, [path, table, ',', newline], function (err) {
        assert.ok(err);
        assert.equal(err.code, 'ER_NOT_ALLOWED_COMMAND');
      });

      connection.query('SELECT * FROM ??', [table], function (err, rows) {
        assert.ifError(err);
        assert.equal(rows.length, 0);
      });
    }
    connection.end(assert.ifError);
  });
});
