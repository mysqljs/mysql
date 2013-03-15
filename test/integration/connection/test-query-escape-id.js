var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'escape_id_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`example` varchar(255),',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO ?? SET ?? = ?, ?? = ?', [ table, 'id', 1, 'example', 'id escape']);

var rows;
connection.query('SELECT * FROM ??', [ table ], function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();


process.on('exit', function() {
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {id: 1, example: 'id escape'});
});
