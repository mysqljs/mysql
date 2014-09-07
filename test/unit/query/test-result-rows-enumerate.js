var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

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
