var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'escape_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`example` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO ' + table + ' SET id = ?, example = ?', [1, 'array escape']);
connection.query('INSERT INTO ' + table + ' SET ?', {
  id: 2,
  example: 'object escape'
});

var rows;
connection.query('SELECT * FROM escape_test', function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();


process.on('exit', function() {
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {id: 1, example: 'array escape'});
  assert.deepEqual(rows[1], {id: 2, example: 'object escape'});
});
