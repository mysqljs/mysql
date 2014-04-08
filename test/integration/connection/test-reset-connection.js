var common     = require('../../common');
var connection = common.createConnection();
var assert     = require('assert');

connection.connect(assertError);

connection.query('SET @user_var = \'apple\'', assertError);

connection.query('SELECT @user_var AS var', function(err, rows) {
  assert.ifError(err);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].var, 'apple');
});

connection.reset(assertError);

connection.query('SELECT @user_var AS var', function(err, _rows) {
  assert.ifError(err);
  assert.equal(rows.length, 0);
});

connection.end(assertError);

function assertError(err) {
  assert.ifError(err);
}
