var after  = require('after');
var assert = require('assert');
var common = require('../../common');
var pool   = common.createPool({
  port                        : common.fakeServerPort,
  roundRobinConnectionCycling : false
});

var server = common.createFakeServer();
var lastConnectionId = null;
var numberOfConnections = 4;

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  var getConnectionAndEnsureItsTheLastConnection = function(cb) {
    pool.getConnection(function (err, connection) {
      assert.ifError(err);
      assert.ok(connection.id === lastConnectionId);
      connection.release();
      if (cb) cb();
    });
  };

  var done = after(numberOfConnections, function () {
    getConnectionAndEnsureItsTheLastConnection(function() {
      getConnectionAndEnsureItsTheLastConnection(function() {
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
      lastConnectionId = connection.id;
      connection.release();
      done();
    });
  };
  Array.apply(null, {length: numberOfConnections}).map(createIndexedConnection);
});
