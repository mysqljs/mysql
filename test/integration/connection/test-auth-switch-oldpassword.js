var assert = require('assert');
var common = require('../../common');

common.getTestConnection(function (err, connection) {
  assert.ifError(err);

  connection.query('SHOW PLUGINS', function(err, result) {
    if (err) {
      common.skipTest('No client auth plugins supported.');
    }

    mysql_old_password_found = false;
    result.forEach(function(plugin) {
      if (plugin.Name === 'mysql_old_password' && plugin.Status === 'ACTIVE') {
        mysql_old_password_found = true;
      }
    });

    if (!mysql_old_password_found) {
      common.skipTest('Can not found mysql_old_password auth plugin');
    }

    connection.query('CREATE USER \'old_pass_auth\'@\'%\' IDENTIFIED WITH mysql_old_password', function (err) {
      assert.ifError(err);
      connection.query('SET OLD_PASSWORDS=1', function (err) {
        assert.ifError(err);
        connection.query('SET PASSWORD FOR \'old_pass_auth\'@\'%\' = PASSWORD(\'test\')', function (err) {
          assert.ifError(err);
          connection.query('SET GLOBAL SECURE_AUTH=0', function (err) {
            assert.ifError(err);
            common.getTestConnection({user: 'old_pass_auth', password: 'test', insecureAuth: true}, function (err, conn) {
              assert.ifError(err);
              conn.end(assert.ifError);
              connection.query('SET GLOBAL SECURE_AUTH=1', function (err) {
                assert.ifError(err);
                connection.query('DROP USER \'old_pass_auth\'@\'%\'', function (err) {
                  assert.ifError(err);
                  connection.end(assert.ifError);
                });
              });
            });
          });
        });
      });
    });
  });
});

