var common = require('../../common');
var assert = require('assert');
var connection = common.createConnection();

common.useTestDb(connection);

var table = 'insert_test';
connection.query([
  'CREATE TEMPORARY TABLE `' + table + '` (',
  '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`created_at` datetime,',
  'PRIMARY KEY (`id`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

var result;
var now = new Date();
// Removing the decimal portion of the date string for Travis CI.
var nowString = now.toISOString().replace(/\.\d\d\dZ/, '');

connection.query('INSERT INTO ' + table + ' SET ?', {created_at: nowString}, function(err, _result) {
  if (err) throw err;

  var sql = 'SELECT * FROM ' + table + ' WHERE id = ?';
  connection.query(sql, [_result.insertId], function(err, _result) {
    connection.end();
    if (err) throw err;

    result = _result[0].created_at;
  });
});


process.on('exit', function() {
  var tzOffsetHours = new Date().getTimezoneOffset() / 60;
  var expectedHours = now.getHours() + tzOffsetHours;
  var actualHours = result.getHours();
  assert.strictEqual(actualHours, expectedHours);
});
