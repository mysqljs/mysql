var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');
var util       = require('util');

common.useTestDb(connection);

var table = 'dates_as_strings';
var rows;

connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`dt` DATE,',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO ' + table + ' SET ?', {dt: '0000-00-00'});
connection.query('INSERT INTO ' + table + ' SET ?', {dt: '2013-00-00'});
connection.query('INSERT INTO ' + table + ' SET ?', {dt: '2013-03-00'});
connection.query('INSERT INTO ' + table + ' SET ?', {dt: '2013-03-01'});

connection.query('SELECT * FROM ' + table, function(err, _rows) {
  if (err) throw err;

  rows = _rows;
});

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 4);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].dt, '0000-00-00');
  assert.equal(rows[1].id, 2);
  assert.equal(rows[1].dt, '2013-00-00');
  assert.equal(rows[2].id, 3);
  assert.equal(rows[2].dt, '2013-03-00');
  assert.equal(rows[3].id, 4);
  assert(util.isDate(rows[3].dt));
});
