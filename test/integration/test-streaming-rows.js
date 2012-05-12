var common     = require('../common');
var connection = common.createConnection();
var assert     = require('assert');

common.useTestDb(connection);

var table = 'stream_test';
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

var paused = false;
var query  = connection.query('SELECT * FROM ' + table);

var hadEnd = 0;
var rows   = [];
query
  .on('result', function(row) {
    // Make sure we never receive a row while being paused
    assert.equal(paused, false);

    paused = true;
    connection.pause();

    setTimeout(function() {
      paused = false;
      connection.resume();

      rows.push(row);
    }, 10);
  })
  .on('end', function() {
    hadEnd = true;
  });

connection.end();

process.on('exit', function() {
  assert.equal(rows.length, 10);
  assert.equal(hadEnd, true);
});
