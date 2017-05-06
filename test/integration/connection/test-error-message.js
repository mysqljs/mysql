var assert = require('assert');
var common = require('../../common');

var table = 'error_message_test';
var message = 'Name must not contain b.';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

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
  ].join('\n'), [table, message], assert.ifError);

  // Violates trigger condition, so it will throw an error on insert
  var row = ['bbbbbbbbbb'];

  connection.query('INSERT INTO ?? (name) VALUES ?', [table, [row]], function (err) {
    assert.equal(err.sqlMessage, message,
                 'err.sqlMessage is the trigger error message');

    connection.end(assert.ifError);
  });
});
