var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'transaction_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('START TRANSACTION');

var rowCount = 10;
for (var i = 1; i <= rowCount; i++) {
  var row = {
    id: i,
    title: 'Row #' + i,
  };

  connection.query('INSERT INTO ' + table + ' SET ?', row);
}

connection.query('ROLLBACK');

var rows;
var query = connection.query('SELECT * FROM ' + table, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 0);
});
