var assert     = require('assert');
var common     = require('../../common');
var pool1   = common.createPool({port: common.fakeServerPort});
var pool2   = common.createPool({port: common.fakeServerPort, queryFormat: queryFormat});


function queryFormat(query, values, tz) {
  if (!values) {
    return query;
  }

  var escape = this.escape.bind(this);

  return query.replace(/\:(\w+)/g, function (txt, key) {
    if (values.hasOwnProperty(key)) {
      return escape(values[key]);
    }
    return txt;
  });
}

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);



  // When the fix is applied, this query demonstrates that connection.query(),
  // which gets invoked internally by pool.query(), will not re-format the query
  // a second time. Re-formatting the query a second time in this case would cause
  // an error when the question marks inside the string 'John ? J ?' are interpreted
  // as placeholders for values.

  assert.equal(pool1.query('SELECT ?? FROM ?? WHERE id=? OR name=?', [['name', 'rdate'], 'dummytable', 1, "John ? J ?"]).sql, 'SELECT `name`, `rdate` FROM `dummytable` WHERE id=1 OR name=\'John ? J ?\'');



  // This one will will fail before the fix is applied

  assert.equal(pool2.query('SELECT :a1, :a2', { a1: 1, a2: 'two' }).sql, 'SELECT 1, \'two\'');



  // These last 2 will work before and after the fix is applied as there is no transformation performed

  assert.equal(pool2.query('SELECT :a1', []).sql, 'SELECT :a1');
  assert.equal(pool2.query('SELECT :a1').sql, 'SELECT :a1');



  pool1.end(function (err) {
    assert.ifError(err);
    pool2.end(function (err) {
      assert.ifError(err);
      server.destroy();
    });
  });

});
