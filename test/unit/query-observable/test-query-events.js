var assert     = require('assert');
var common     = require('../../common');
var connection = common.createConnection({port: common.fakeServerPort});

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var rows   = [];

  var query = connection.queryObservable('SELECT 1');

  query.subscribe(function(row){
    rows.push(row);
  }, assert.ifError, function(){ });

  connection.end(function (err) {
    assert.ifError(err);
    assert.deepEqual(rows, [{1: 1}]);
    server.destroy();
  });

});
