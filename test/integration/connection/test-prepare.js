var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'prepare_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var rowCount = 10;
for (var i = 1; i <= rowCount; i++) {
  var row = {
    id: i,
    title: 'Row #' + i,
  };

  connection.query('INSERT INTO ' + table + ' SET ?', row);
}

var statement = connection.prepare('SELECT * FROM '+table+' WHERE id = ?');
statement.execute(1, function() {
  console.log(arguments);
});
