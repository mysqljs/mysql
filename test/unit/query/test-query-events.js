var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  var rows   = [];
  var fields = [];

  var query = connection.query('SELECT 1');

  query.on('error', assert.ifError);
  query.on('fields', function (_fields) {
    fields = _fields;
  });
  query.on('result', function (_rows) {
    rows.push(_rows);
  });

  connection.end(function (err) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
    assert.equal(fields.length, 1);
    assert.equal(fields[0].name, '1');
    server.destroy();
  });
});
