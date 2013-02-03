var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');
var _          = require('underscore');

common.useTestDb(connection);

var table = 'insert_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`title` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var result;
var items = [];
var itemsFoundInTable = [];

for(var i = 0; i < 100; i++)
  items[i] = ['test '+i];

connection.query('INSERT INTO ' + table + ' (title) VALUES ? ', [items], function(err, _result) {
  if (err) throw err;

  result = _result;
  
  connection.query('SELECT title FROM '+table+';', [], function(err, _items) {
    itemsFoundInTable =  _.map(_items, function(row) { return [row.title]; });
	connection.end();
  });
});

process.on('exit', function() {
  assert.deepEqual(items, itemsFoundInTable);
});
