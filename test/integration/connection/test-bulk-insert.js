var common = require('../../common');
var assert = require('assert');
var _      = require('underscore');

var table = 'insert_test';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`title` varchar(255),',
    'PRIMARY KEY (`id`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  var items = [];
  for (var i = 0; i < 100; i++) {
    items[i] = ['test ' + i];
  }

  connection.query('INSERT INTO ?? (title) VALUES ?', [table, items], function (err) {
    assert.ifError(err);

    connection.query('SELECT title FROM ??', [table], function (err, rows) {
      assert.ifError(err);

      var itemsFoundInTable = _.map(rows, function(row) { return [row.title]; });

      assert.deepEqual(items, itemsFoundInTable);

      connection.end(assert.ifError);
    });
  });
});
