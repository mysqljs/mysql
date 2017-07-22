var inherits   = require('util').inherits;
var Connection = require('./Connection');
var Events     = require('events');

module.exports = PoolConnection;
inherits(PoolConnection, Connection);

var _connectionId = 1;

function PoolConnection(pool, options) {
  Connection.call(this, options);

  this._id = _connectionId++;
  this._pool = pool;
  this._used = true;
  this._removed = false;
  this._reuseCount = 0;
  this._lastUsedTime = Date.now();

  // Bind connection to pool domain
  if (Events.usingDomains) {
    this.domain = pool.domain;
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
  if (this.hasPool()) {
    this._pool.releaseConnection(this);
  }
};

// TODO: Remove this when we are removing PoolConnection#end
PoolConnection.prototype._realEnd = Connection.prototype.end;

PoolConnection.prototype.end = function () {
  console.warn( 'Calling conn.end() to release a pooled connection is ' +
                'deprecated. In next version calling conn.end() will be ' +
                'restored to default conn.end() behavior. Use ' +
                'conn.release() instead.'
              );
  this.release();
};

PoolConnection.prototype.destroy = function () {
  Connection.prototype.destroy.call(this);
  this._removeFromPool();
};

PoolConnection.prototype.getId = function() {
  return this._id;
};

PoolConnection.prototype.updateLastUsedTime = function() {
  this._lastUsedTime = Date.now();
};

PoolConnection.prototype.getLastUsedTime = function() {
  return this._lastUsedTime;
};

PoolConnection.prototype.setUsed = function(used) {
  this._used = used;
};

PoolConnection.prototype.isUsed = function() {
  return this._used;
};

PoolConnection.prototype.setRemoved = function(removed) {
  this._removed = removed;
};

PoolConnection.prototype.isRemoved = function() {
  return this._removed;
};

PoolConnection.prototype.increaseReuseCount = function() {
  this._reuseCount++;
};

PoolConnection.prototype.getReuseCount = function() {
  return this._reuseCount;
};

PoolConnection.prototype.hasPool = function() {
  return this._pool !== null;
};

PoolConnection.prototype.isSamePool = function(pool) {
  return this._pool === pool;
};

PoolConnection.prototype.detachPool = function() {
  this._pool = null;
};

PoolConnection.prototype._removeFromPool = function () {
  if (this.hasPool()) {
    this._pool._purgeConnection(this);
  }
};
