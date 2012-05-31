var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'load_data_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var path = common.fixtures + '/data.csv';
var sql =
  'LOAD DATA LOCAL INFILE ? INTO TABLE ' + table + ' ' +
  'FIELDS TERMINATED BY ? (id, title)';

var ok;
connection.query(sql, [path, ','], function(err, _ok) {
  if (err) throw err;

  ok = _ok;
});

var rows;
connection.query('SELECT * FROM ' + table, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

// Try to load a file that does not exist to see if we handle this properly
var loadErr;
var loadResult;
var badPath = common.fixtures + '/does_not_exist.csv';

connection.query(sql, [badPath, ','], function(err, result) {
  loadErr    = err;
  loadResult = result;
});

connection.end();

process.on('exit', function() {
  assert.equal(ok.affectedRows, 3);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].title, 'Hello World');

  assert.equal(loadErr.code, 'ENOENT');
  assert.equal(loadResult.affectedRows, 0);
});
