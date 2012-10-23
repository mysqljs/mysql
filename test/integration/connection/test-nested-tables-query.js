var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'nested_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO ' + table + ' SET ?', {title: 'test'});

var options1 = {
  nestTables: true,
  sql: 'SELECT * FROM ' + table
};
var options2 = {
  nestTables: '_',
  sql: 'SELECT * FROM ' + table
};
var rows1, rows2;

connection.query(options1, function(err, _rows) {
  if (err) throw err;

  rows1 = _rows;
});
connection.query(options2, function(err, _rows) {
  if (err) throw err;

  rows2 = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows1.length, 1);
  assert.equal(rows1[0].nested_test.id, 1);
  assert.equal(rows1[0].nested_test.title, 'test');
  assert.equal(rows2.length, 1);
  assert.equal(rows2[0].nested_test_id, 1);
  assert.equal(rows2[0].nested_test_title, 'test');
});
