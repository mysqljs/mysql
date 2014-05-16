var inherits = require('util').inherits;
var Connection = require('./Connection')
var __changeUser = Connection.prototype.changeUser;

module.exports = PoolConnection;
inherits(PoolConnection, Connection);

function PoolConnection(pool, options) {
  Connection.call(this, options);
  this._pool  = pool;
  this._purge = false

  // When a fatal error occurs the connection's protocol ends, which will cause
  // the connection to end as well, thus we only need to watch for the end event
  // and we will be notified of disconnects.
  this.on('end', this._removeFromPool);
  this.on('error', this._removeFromPool);
}

PoolConnection.prototype.changeUser = function changeUser(options, callback) {
  this._purge = true;

  return __changeUser.apply(this, arguments);
};

PoolConnection.prototype.release = function release() {
  var pool = this._pool;

  if (!pool || pool._closed) {
    return;
  }

  return pool.releaseConnection(this);
};

// TODO: Remove this when we are removing PoolConnection#end
PoolConnection.prototype._realEnd = Connection.prototype.end;

PoolConnection.prototype.end = function () {
  console.warn( 'Calling conn.end() to release a pooled connection is '
              + 'deprecated. In next version calling conn.end() will be '
              + 'restored to default conn.end() behavior. Use '
              + 'conn.release() instead.'
              );
  this.release();
};

PoolConnection.prototype.destroy = function () {
  this._removeFromPool(this);
  return Connection.prototype.destroy.apply(this, arguments);
};

PoolConnection.prototype._removeFromPool = function(connection) {
  if (!this._pool || this._pool._closed) {
    return;
  }

  var pool = this._pool;
  this._pool = null;

  pool._removeConnection(this);
};
