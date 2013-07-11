var common     = require('../../common');
var assert     = require('assert');
var Connection = require(common.lib + '/Connection');
var PoolConnection = require(common.lib + '/PoolConnection');
var EventEmitter = require('events').EventEmitter;
var pool       = common.createPool();

pool.getConnection(function (err, conn) {
  if (err) throw err;

  assert(conn instanceof PoolConnection);
  assert(conn instanceof Connection);
  assert(conn instanceof EventEmitter);

  pool.end();
});
