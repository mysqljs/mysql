var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort, user: 'testuser'});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  connection.query({
    sql       : 'SELECT CURRENT_USER()',
    arrayRows : true
  }, function (err, rows) {
    assert.ifError(err);
    assert.deepEqual(rows, [['testuser@localhost']]);

    connection.destroy();
    server.destroy();
  });

});
