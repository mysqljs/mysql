var inherits   = require('util').inherits;
var Connection = require('./Connection');
var Events     = require('events');

module.exports = PoolConnection;
inherits(PoolConnection, Connection);

var poolConnectionId = 1;

function PoolConnection(pool, options) {
  Connection.call(this, options);

  this._pool = pool;
  this._poolData = {
    id : poolConnectionId++,
    used : true,
    removed : false,
    lastUsedTime : 0
  };

  // Bind connection to pool domain
  if (Events.usingDomains) {
    if (this.domain) {
      this.domain.remove(this);
    }

    if (pool.domain) {
      pool.domain.add(this);
    }
  }

  // When a fatal error occurs the connection's protocol ends, which will cause
  // the connection to end as well, thus we only need to watch for the end event
  // and we will be notified of disconnects.
  this.on('end', this._removeFromPool);
  this.on('error', function (err) {
    if (err.fatal) {
      this._removeFromPool();
    }
  });
}

PoolConnection.prototype.release = function () {
  if (this._pool) {
    this._pool.releaseConnection(this);
  }
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
  Connection.prototype.destroy.call(this);
  this._removeFromPool();
};

PoolConnection.prototype._removeFromPool = function () {
  if (this._pool) {
    this._pool._purgeConnection(this);
  }
};
