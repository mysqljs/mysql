var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'insert_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`date` DATETIME NULL,',
  '`number` INT NULL,',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO ' + table + ' SET ?', {
  date   : null,
  number : null,
});

var results;
connection.query('SELECT * FROM ' + table, function(err, _results) {
  if (err) throw err;

  results = _results;
});

connection.end();

process.on('exit', function() {
  assert.strictEqual(results[0].date, null);
  assert.strictEqual(results[0].number, null);
});
