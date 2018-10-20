var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.queryObservable('SELECT CURRENT_USER()').subscribe(function(row) {
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
  }, function(err) {
    assert.ifError(err);
  });
});
