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

connection.beginTransaction(function (err) {
  assert.ifError(err);
  
  var row = {
    id: 1,
    title: 'Test row'
  };

  connection.query('INSERT INTO ' + table + ' SET ?', row, function(err) {
    assert.ifError(err);

    connection.commit(function(err) {
      assert.ifError(err);

      connection.query('SELECT * FROM ' + table, function(err, rows) {
        assert.ifError(err);
        connection.end();
        assert.equal(rows.length, 1);
      });
    });
  });
});