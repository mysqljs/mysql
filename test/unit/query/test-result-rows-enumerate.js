var assert = require('assert');
var common = require('../../common');

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var connection = common.createConnection({port: server.port()});

  connection.query('SELECT CURRENT_USER()', function (err, rows) {
    assert.ifError(err);
    assert.equal(rows.length, 1);

    var row = rows[0];
    var keys = Object.keys(row).sort();

    assert.equal(keys.length, 1);
    assert.deepEqual(keys, ['CURRENT_USER()']);

    var forin = [];
    for (var column in row) {
      forin.push(column);
    }

    assert.deepEqual(forin, keys);

    connection.destroy();
    server.destroy();
  });
});
