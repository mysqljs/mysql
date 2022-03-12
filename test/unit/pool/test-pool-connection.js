var assert         = require('assert');
var common         = require('../../common');
var Connection     = common.Connection;
var EventEmitter   = require('events').EventEmitter;
var PoolConnection = common.PoolConnection;

var server = common.createFakeServer();

server.listen(0, function (err) {
  assert.ifError(err);

  var pool = common.createPool({port: server.port()});

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert(connection instanceof PoolConnection);
    assert(connection instanceof Connection);
    assert(connection instanceof EventEmitter);

    connection.destroy();
    server.destroy();
  });
});
