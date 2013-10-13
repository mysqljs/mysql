var inherits = require('util').inherits
  , Connection = require('./Connection')

module.exports = PoolConnection;
inherits(PoolConnection, Connection);

function PoolConnection(pool, options) {
  Connection.call(this, options);
  this._pool = pool;

  // When a fatal error occurs the connection's protocol ends, which will cause
  // the connection to end as well, thus we only need to watch for the end event
  // and we will be notified of disconnects.
  this.on('end', this._removeFromPool);
  this.on('error', this._removeFromPool);
}

PoolConnection.prototype.release = function () {
  if (!this._pool || this._pool._closed) {
    return;
  }

  return this._pool.releaseConnection(this);
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
