// Based on:
// https://github.com/ichernev/node-mysql/blob/on-duplicate-key-update/test/integration/connection/test-on-duplicate-key-update.js
// (but with CLIENT_FOUND_ROWS connection flag blacklisted)

var common     = require('../../common');
var connection = common.createConnection({ flags: "-FOUND_ROWS" });
var assert     = require('assert');

common.useTestDb(connection);

var table = 'on_duplicate_key_test';
connection.query('DROP TABLE IF EXISTS `' + table + '`');
connection.query([
  'CREATE TABLE `' + table + '` (',
  '`a` int(11) unsigned NOT NULL AUTO_INCREMENT,',
  '`b` int(11),',
  '`c` int(11),',
  'PRIMARY KEY (`a`)',
  ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
].join('\n'));

connection.query('INSERT INTO `' + table + '` SET ?', {a: 1, b: 1, c: 1});

connection.query('INSERT INTO `' + table + '` (a, b, c) VALUES (1, 2, 3) ON DUPLICATE KEY UPDATE c = 1', function(err, info) {
  assert.strictEqual(null, err);
  assert.strictEqual(0, info.affectedRows, 'both primary key and updated key are the same so nothing is affected (expected 0, got ' + info.affectedRows + ' affectedRows)');
});

connection.query('INSERT INTO `' + table + '` (a, b, c) VALUES (2, 3, 4) ON DUPLICATE KEY UPDATE c = 1', function(err, info) {
  assert.strictEqual(null, err);
  assert.strictEqual(1, info.affectedRows, 'primary key differs, so new row is inserted (expected 1, got ' + info.affectedRows + ' affectedRows)');
});

connection.query('INSERT INTO `' + table + '` (a, b, c) VALUES (1, 2, 3) ON DUPLICATE KEY UPDATE c = 2', function(err, info) {
  assert.strictEqual(null, err);
  assert.strictEqual(2, info.affectedRows, 'primary key is the same, row is updated (expected 2, got ' + info.affectedRows + ' affectedRows)');
});

connection.end();
