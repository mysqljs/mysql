var assert = require('assert');
var common = require('../../common');

function queryFormat(query, values) {
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

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({
    port        : server.port(),
    queryFormat : queryFormat
  });

  assert.equal(connection.format('SELECT :a1, :a2', { a1: 1, a2: 'two' }), 'SELECT 1, \'two\'');
  assert.equal(connection.format('SELECT :a1', []), 'SELECT :a1');
  assert.equal(connection.format('SELECT :a1'), 'SELECT :a1');

  connection.destroy();
  server.destroy();
});
