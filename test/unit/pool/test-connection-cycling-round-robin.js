var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({port: common.fakeServerPort});

var server = common.createFakeServer();
var numberOfConnections = 4;
var connectionIds = [];
var connectionNumber = 0;

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var getConnectionAndEnsureItsTheCorrectOne = function(cb) {
    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      assert.ok(connection.id === connectionIds[connectionNumber]);
      connectionNumber++;
      connection.release();
      if (cb) cb();
    });
  };

  var done = after(numberOfConnections, function () {
    getConnectionAndEnsureItsTheCorrectOne(function() {
      getConnectionAndEnsureItsTheCorrectOne(function() {
        pool.end(function (err) {
          assert.ifError(err);
          server.destroy();
        });
      });
    });
  });

  var counter = 1;

  var createIndexedConnection = function () {
    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      connection.id = counter++;
      connectionIds.push(connection.id);
      connection.release();
      done();
    });
  };
  Array.apply(null, Array(numberOfConnections)).map(createIndexedConnection);
});
