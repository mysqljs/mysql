var EventEmitter = require('events').EventEmitter;
var Util         = require('util');

// ============================================================================
// PoolManager
// ============================================================================

exports.PoolManager = PoolManager;

function PoolManager(pool) {
  EventEmitter.call(this);

  this.setMaxListeners(0);

  this._pool = pool;
  this._started = false;
  this._checkIdleHandle  = null;
  this._timeoutTimer = {};

  this._generateConfigVariables();
}

Util.inherits(PoolManager, EventEmitter);

PoolManager.prototype.start = function() {
  this._createInitialConnections();
};

PoolManager.prototype.end = function() {
  if (this._checkIdleHandle !== null) {
    clearInterval(this._checkIdleHandle);
    this._checkIdleHandle = null;
  }
};

PoolManager.prototype.isNotStarted = function() {
  return this._started !== true;
};

PoolManager.prototype.afterStarted = function(cb) {
  this.on('started', cb);
};

PoolManager.prototype.connect = function (connection, cb) {
  if (this._maxWait <= 0) {
    return connection.connect(cb.bind(null));
  }

  this._timeoutTimer[connection._id] = setTimeout(function() {
    connection.destroy();
    cb(new Error('Timed out (DB Connection)'));
  }, this._maxWait);

  connection.connect(function(err) {
    clearTimeout(this._timeoutTimer[connection._id]);
    cb(err);
  }.bind(this));
};

PoolManager.prototype._generateConfigVariables = function() {
  var config = this._pool.config;

  this._initialSize = config.initialSize;
  this._minIdle = config.minIdle;
  this._maxIdle = config.maxIdle;
  this._idleCheckInterval = config.idleCheckInterval;
  this._idleCheckNumPerRun = config.idleCheckNumPerRun;
  this._maxWait = config.maxWait;
};

PoolManager.prototype._createInitialConnections = function() {
  if (this._initialSize <= 0) {
    return this._endInitialConnections(0);
  }

  var attemptedConnect = 0;
  var attachedConnect = 0;

  this._executeFunction(function () {
    var connection = this._pool._createConnection();

    this.connect(connection, function(err) {
      if (!err) {
        attachedConnect++;
        this._attachConnection(connection);
      }

      if (++attemptedConnect === this._initialSize) {
        this._endInitialConnections(attachedConnect);
      }
    }.bind(this));
  }).times(this._initialSize);
};

PoolManager.prototype._endInitialConnections = function(poolSize) {
  this._started = true;

  process.nextTick(this._pool.emit.bind(this._pool, 'initialized', poolSize));

  this._startIdleAction();

  this.emit('started');
};

PoolManager.prototype._startIdleAction = function() {
  this._maxIdle = Math.max(this._maxIdle, this._minIdle);

  if (this._minIdle > 0 || this._maxIdle > 0) {
    this._checkIdleHandle = setInterval(this._checkIdle.bind(this), this._idleCheckInterval);
  }
};

PoolManager.prototype._checkIdle = function() {
  // check minIdle
  if (this._minIdle > 0) {
    var needfulCreateConnection = this._getNeedCount(this._minIdle, this._pool.getFreeSize());
    if (needfulCreateConnection > 0) {
      this._executeFunction(function() {
        var connection = this._pool._createConnection();

        connection.connect(function (err) {
          if (!err) {
            this._attachConnection(connection);
          }
        }.bind(this));
      }).times(needfulCreateConnection);

      return;
    }
  }

  // check maxIdle
  if (this._maxIdle > 0) {
    var needfulRemoveConnection = this._getNeedCount(this._pool.getFreeSize(), this._maxIdle);
    if (needfulRemoveConnection > 0) {
      this._executeFunction(this._detachAnyConnection.bind(this)).times(needfulRemoveConnection);
    }
  }
};

PoolManager.prototype._getNeedCount = function(targetA, targetB) {
  var count = targetA - targetB;
  if (count <= 0 || this._idleCheckNumPerRun === 0) {
    return count;
  }

  return Math.min(count, this._idleCheckNumPerRun);
};

PoolManager.prototype._executeFunction = function (fn) {
  return {
    _scope: this,
    _fn: fn,
    times: function(num) {
      if (typeof this._fn !== 'function') {
        return;
      }

      for (var i = 0; i < num; i++) {
        process.nextTick(this._fn.bind(this._scope));
      }
    }
  };
};

PoolManager.prototype._attachConnection = function (connection) {
  var pool = this._pool;

  pool._allConnections.add(connection, true);

  pool.emit('connection', connection);

  var cb = pool._connectionQueue.get();
  if (cb) {
    process.nextTick(cb.bind(null, null, connection));
  } else {
    pool._freeConnections.add(connection);
  }
};

PoolManager.prototype._detachAnyConnection = function () {
  var pool = this._pool;

  var connection = pool._freeConnections.get();
  if (connection) {
    pool._removeConnection(connection, true);
  }
};

// ============================================================================
// PoolConnection
// ============================================================================

var PoolConnection = exports.PoolConnection = {};

// All Connections
PoolConnection.All = function() {
    this._length   = 0;
    this._lastId  = 0;
    this._storage = {};
};

PoolConnection.All.prototype.getId = function() {
  return ++this._lastId;
};

PoolConnection.All.prototype.length = function() {
  return this._length;
};

PoolConnection.All.prototype.add = function(connection, incr) {
  this._storage[connection._id] = connection;

  if (incr === true) {
    this.incrLength();
  }
};

PoolConnection.All.prototype.remove = function(connection) {
  delete this._storage[connection._id];
  this.decrLength();
};

PoolConnection.All.prototype.each = function(fn) {
  for (var key in this._storage) {
    fn(this._storage[key]);
  }
};

PoolConnection.All.prototype.incrLength = function() {
  this._length++;
};

PoolConnection.All.prototype.decrLength = function() {
  this._length--;
};

// Free Connections
PoolConnection.Free = function() {
    this._storage = [];
};

PoolConnection.Free.prototype.length = function() {
  return this._storage.length;
};

PoolConnection.Free.prototype.get = function() {
  return (this._storage.length <= 0) ? null : this._storage.shift();
};

PoolConnection.Free.prototype.add = function(connection) {
  this._storage.push(connection);
};

PoolConnection.Free.prototype.remove = function(connection) {
  for (var i = 0, len = this._storage.length; i < len; i++) {
    if (this._storage[i]._id === connection._id) {
      this._storage.splice(i, 1);
      break;
    }
  }
};

// Client Queue
PoolConnection.Queue = function(pool) {
  this._lastId = 0;
  this._storage = [];
  this._maxWait = pool.config.maxWait;
  this._timeoutTimer = {};
};

PoolConnection.Queue.prototype.length = function() {
  return this._storage.length;
};

PoolConnection.Queue.prototype.add = function(cb) {
  var id = this._add(cb);

  if (this._maxWait > 0) {
    this._timeoutTimer[id] = setTimeout(this._timeout.bind(this, id), this._maxWait);
  }
};

PoolConnection.Queue.prototype.get = function() {
  var obj = this._get();
  if (!obj) {
    return null;
  }

  if (this._maxWait > 0) {
    clearTimeout(this._timeoutTimer[obj._id]);
  }

  return obj._cb;
};

PoolConnection.Queue.prototype.each = function(fn) {
  this._storage.forEach(function(obj) {
    obj._cb._PE_CALLED = true;
    process.nextTick(fn.bind(null, obj._cb));
  });
};

PoolConnection.Queue.prototype._timeout = function(id) {
  var cb = this._remove(id);
  if (cb && cb._PE_CALLED === undefined) {
    cb._PE_CALLED = true;
    cb(new Error('Timed out (getConnection)'));
  }
};

PoolConnection.Queue.prototype._add = function(cb) {
  var obj = {
    _id: ++this._lastId,
    _cb: cb
  };

  this._storage.push(obj);

  return obj._id;
};

PoolConnection.Queue.prototype._get = function() {
  return (this._storage.length <= 0) ? null : this._storage.shift();
};

PoolConnection.Queue.prototype._remove = function(id) {
  var cb = null;

  for (var i = 0, len = this._storage.length; i < len; i++) {
    if (this._storage[i]._id === id) {
      cb = this._storage[i]._cb;
      this._storage.splice(i, 1);
      break;
    }
  }

  return cb;
};
