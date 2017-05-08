var assert = require('assert');
var common = require('../../common');

var table = 'error_message_test';
var message = 'Name must not contain b.';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  // Must use real table because temporary tables cannot have triggers
  connection.query([
    'CREATE TABLE ?? (',
    '`name` varchar(255)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
  ].join('\n'), [table], assert.ifError);

  // Create a trigger that throws error when name contains the letter "b"
  connection.query([
    'CREATE TRIGGER `validateName`',
    'BEFORE INSERT ON ??',
    'FOR EACH ROW BEGIN',
    'IF (NEW.name like \'%b%\') THEN',
    'SIGNAL SQLSTATE \'45000\' SET MESSAGE_TEXT = ?;',
    'END IF;',
    'END;'
  ].join('\n'), [table, message], function (err) {
    // Clean up table if create trigger fails
    connection.query('DROP TABLE IF EXISTS ??', [table], assert.ifError);
    assert.ifError(err);
  });

  // Violates trigger condition, so it will throw an error on insert
  var row = ['bbbbbbbbbb'];

  connection.query('INSERT INTO ?? (name) VALUES ?', [table, [row]], function (insertErr) {
    // Remove table when insert finishes
    connection.query('DROP TABLE IF EXISTS ??', [table], function (err) {
      assert.ifError(err);
      connection.end(assert.ifError);
      assert.equal(insertErr.sqlMessage, message,
                   'error sqlMessage property is the trigger error message');
    });
  });
});
