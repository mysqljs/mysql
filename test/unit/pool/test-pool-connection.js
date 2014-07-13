var assert         = require('assert');
var common         = require('../../common');
var Connection     = common.Connection;
var EventEmitter   = require('events').EventEmitter;
var pool           = common.createPool({port: common.fakeServerPort});
var PoolConnection = common.PoolConnection;

var server = common.createFakeServer();

server.listen(common.fakeServerPort, function (err) {
  assert.ifError(err);

  pool.getConnection(function (err, connection) {
    assert.ifError(err);

    assert(connection instanceof PoolConnection);
    assert(connection instanceof Connection);
    assert(connection instanceof EventEmitter);

    connection.destroy();
    server.destroy();
  });
});
