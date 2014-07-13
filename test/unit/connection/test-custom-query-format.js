var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort, queryFormat: queryFormat});

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

  assert.equal(connection.format('SELECT :a1, :a2', { a1: 1, a2: 'two' }), 'SELECT 1, \'two\'');
  assert.equal(connection.format('SELECT :a1', []), 'SELECT :a1');
  assert.equal(connection.format('SELECT :a1'), 'SELECT :a1');

  connection.destroy();
  server.destroy();
});
