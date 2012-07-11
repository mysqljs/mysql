var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

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
connection.query('INSERT INTO ' + table + ' SET ?', {title: 'test'}, function(err, _result) {
  if (err) throw err;

  result = _result;
});
connection.end();

process.on('exit', function() {
  assert.strictEqual(result.insertId, 1);
});
