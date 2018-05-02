var assert = require('assert');
var common = require('../../common');

var table = 'error_message_test';
var message = 'Name must not contain b.';

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  common.useTestDb(connection);

  createTestTable(function (err3) {
    assert.ifError(err3);

    // Violates trigger condition, so it will throw an error on insert
    connection.query('INSERT INTO ?? (name) VALUES ?', [table, [['bbbbbbbbbb']]], function (err4) {
      // Remove table when insert finishes
      connection.query('DROP TABLE IF EXISTS ??', [table], function (err5) {
        assert.ifError(err5);
        assert.ok(err4);
        assert.equal(err4.sqlState, '45000');
        assert.equal(err4.sqlMessage, message, 'error sqlMessage property is the trigger error message');
        connection.end(assert.ifError);
      });
    });
  });

  function createTestTable(cb) {
    // Must use real table because temporary tables cannot have triggers
    connection.query([
      'CREATE TABLE ?? (',
      '`name` varchar(255)',
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
    ].join('\n'), [table], function (err1) {
      if (err1) {
        cb(err1);
      } else {
        // Create a trigger that throws error when name contains the letter "b"
        connection.query([
          'CREATE TRIGGER `validateName`',
          'BEFORE INSERT ON ??',
          'FOR EACH ROW BEGIN',
          'IF (NEW.name like \'%b%\') THEN',
          'SIGNAL SQLSTATE \'45000\' SET MESSAGE_TEXT = ?;',
          'END IF;',
          'END;'
        ].join('\n'), [table, message], function (err2) {
          if (!err2) {
            cb();
          } else {
            // Clean up table if create trigger fails
            connection.query('DROP TABLE IF EXISTS ??', [table], function () {
              cb(err2);
            });
          }
        });
      }
    });
  }
});
