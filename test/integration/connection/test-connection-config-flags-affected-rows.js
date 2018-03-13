// Based on:
// https://github.com/ichernev/node-mysql/blob/on-duplicate-key-update/test/integration/connection/test-on-duplicate-key-update.js
// (but with CLIENT_FOUND_ROWS connection flag blacklisted)

var assert = require('assert');
var common = require('../../common');

var table = 'on_duplicate_key_test';

common.getTestConnection({flags: '-FOUND_ROWS'}, function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  connection.query([
    'CREATE TEMPORARY TABLE ?? (',
    '`a` int(11) unsigned NOT NULL AUTO_INCREMENT,',
    '`b` int(11),',
    '`c` int(11),',
    'PRIMARY KEY (`a`)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  connection.query('INSERT INTO ?? SET ?', [table, {a: 1, b: 1, c: 1}], assert.ifError);

  connection.query('INSERT INTO ?? (a, b, c) VALUES (1, 2, 3) ON DUPLICATE KEY UPDATE c = 1', [table], function (err, result) {
    assert.ifError(err);
    assert.strictEqual(0, result.affectedRows, 'both primary key and updated key are the same so nothing is affected');
  });

  connection.query('INSERT INTO ?? (a, b, c) VALUES (2, 3, 4) ON DUPLICATE KEY UPDATE c = 1', [table], function (err, result) {
    assert.ifError(err);
    assert.strictEqual(1, result.affectedRows, 'primary key differs, so new row is inserted');
  });

  connection.query('INSERT INTO ?? (a, b, c) VALUES (1, 2, 3) ON DUPLICATE KEY UPDATE c = 2', [table], function (err, result) {
    assert.ifError(err);
    assert.strictEqual(2, result.affectedRows, 'primary key is the same, row is updated');
  });

  connection.end(assert.ifError);
});
