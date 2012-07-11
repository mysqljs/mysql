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

var options = {
  nestTables: true,
  sql: 'SELECT * FROM ' + table,
};

var rows;
var query = connection.query(options, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nested_test.id, 1);
  assert.equal(rows[0].nested_test.title, 'test');
});
