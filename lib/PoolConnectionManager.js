var PoolConnection = require('./PoolConnection');

module.exports = PoolConnectionManager;

/**
 * PoolConnectionManager
 *
 * @constructor
 * @param {Pool} pool
 * @param {PoolConfig} config
 * @api public
 */

function PoolConnectionManager(pool, config) {
  this._pool = pool;
  this._config = config;

  // frequently used variables for performance
  this._neverWaitForConnections = !config.waitForConnections;
  this._connectionLimit = config.connectionLimit;
  this._queueLimit = config.queueLimit;
  this._pingCheckInterval = config.pingCheckInterval;
  this._minSpareConnections = config.minSpareConnections;
  this._maxSpareConnections = config.maxSpareConnections;
  this._timeoutConfig = {
    timeout: config.acquireTimeout
  };
  this._handleWaitingCallbacksFn = this._handleWaitingCallbacks.bind(this);

  // base storage for connection and callback
  this._allConnections = this._createAllConnections();
  this._spareConnections = this._createSpareConnections();
  this._waitingList = this._createWaitingList(config.queueWaitTimeout);

  // create initial starting connections
  if (config.startConnections > 0) {
    this._prepared = false;
    this._prepareStartConnections(config.startConnections);
  } else {
    this._prepared = true;
    this._onPreparedStartConnections(0);
  }
}

/**
 * Check if `Pool` is prepared.
 *
 * @return {boolean}
 * @api public
 */

PoolConnectionManager.prototype.isPrepared = function () {
  return this._prepared;
};

/**
 * Return a spare connection.
 * If there's no spare connection, return null.
 *
 * @returns {Object|null}
 * @api public
 */

PoolConnectionManager.prototype.getSpareConnection = function () {
  if (this._spareConnections.isEmpty()) {
    return null;
  }

  var connectionId = this._spareConnections.pick();
  var connection = this._allConnections.getById(connectionId);

  if (connection) {
    connection._poolData.used = true;
  }

  return connection;
};

/**
 * Pass the acquired connection to the callback.
 *
 * @param {PoolConnection} connection
 * @return {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.passConnectionToCallback = function (connection, callback) {
  var pool = this._pool;
  var self = this;

  if (connection._pool !== pool) {
    this._raiseError(callback, 'POOL_ERROR', 'Connection acquired from wrong pool.');
    return;
  }

  // if user is changed
  var changedUser = this._isChangedUser(connection);

  if (changedUser) {
    // restore user back to pool configuration
    connection.config = this._config.newConnectionConfig();
    connection.changeUser(this._timeoutConfig, onOperationComplete);
    return;
  }

  // Reuse of recently used connections
  if (this._pingCheckInterval && (Date.now() - connection._poolData.lastUsedTime) < this._pingCheckInterval) {
    process.nextTick(function() {
      if (connection._poolData.removed) {
        connection.ping(self._timeoutConfig, onOperationComplete);
      } else {
        callback(null, connection);
      }
    });
    return;
  }

  connection.ping(this._timeoutConfig, onOperationComplete);

  function onOperationComplete(err) {
    if (pool._isClosed(callback)) {
      return;
    }

    if (err) {
      self._waitingList.rollback(callback);
      self.purgeConnection(connection);
      return;
    }

    if (changedUser) {
      connection.config.changedUser = false;
      pool.emit('connection', connection);
    }

    self._updateConnectionLastUsedTime(connection);

    callback(null, connection);
  }
};

/**
 * Check if `Pool` can create a new connection.
 *
 * @return {Boolean}
 * @api public
 */

PoolConnectionManager.prototype.canCreateNewConnection = function () {
  return (this._connectionLimit === 0 || this._allConnections.size() < this._connectionLimit);
};

/**
 * Create a new connection.
 *
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.createNewConnection = function (callback) {
  var pool = this._pool;
  var self = this;

  var connection = new PoolConnection(pool, { config: this._config.newConnectionConfig() });
  this._updateConnectionLastUsedTime(connection);
  this._allConnections.add(connection);

  connection.connect(this._timeoutConfig, function onConnect(err) {
    if (pool._isClosed(callback)) {
      return;
    }

    if (err) {
      self.purgeConnection(connection);
      callback(err);
      return;
    }

    pool.emit('connection', connection);

    callback(null, connection);
  });
};

/**
 * Add a callback to the waiting list.
 * The callback is handled when possible.
 *
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.addCallbackToWaitingList = function (callback) {
  if (this.isPrepared()) {
    if (this._neverWaitForConnections) {
      this._raiseError(callback, 'POOL_CONNLIMIT', 'No connections available.');
      return;
    }

    if (this._queueLimit && this._waitingList.size() >= this._queueLimit) {
      this._raiseError(callback, 'POOL_ENQUEUELIMIT', 'Queue limit reached.');
      return;
    }
  }

  // Bind to domain, as dequeue will likely occur in a different domain
  if (process.domain) {
    this._waitingList.add(process.domain.bind(callback));
  } else {
    this._waitingList.add(callback);
  }

  this._pool.emit('enqueue');
};

/**
 * Release an unnecessary connection.
 *
 * @param {PoolConnection} connection
 * @api public
 */

PoolConnectionManager.prototype.releaseConnection = function (connection) {
  if (!connection._poolData.used) {
    throw new Error('Connection already released');
  }

  if (this._waitingList.isEmpty()) {
    this._updateConnectionLastUsedTime(connection, false);
    this._spareConnections.add(connection);
  } else {
    var callback = this._waitingList.pick();
    this.passConnectionToCallback(connection, callback);
  }
};

/**
 * Destroy all.
 *
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.destroy = function (callback) {
  clearInterval(this._spareCheckHandle);

  // throws error to waiting connections
  var self = this;

  this._waitingList.destroy(function (waitingCallback) {
    self._raiseError(waitingCallback, 'POOL_CLOSED', 'Pool is closed.');
  });

  var waitingClose = this._allConnections.size();
  if (waitingClose === 0) {
    callback();
    return;
  }

  // purges all connections
  var calledBack   = false;
  function onEndPurge(err) {
    if (!calledBack && (err || --waitingClose <= 0)) {
      calledBack = true;
      callback(err);
    }
  }

  this._allConnections.destroy(function (connection) {
    self.purgeConnection(connection, onEndPurge);
  });
};

/**
 * Purge an connection from `Pool`.
 *
 * @param {PoolConnection} connection
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.purgeConnection = function (connection, callback) {
  if (connection._poolData.removed) {
    return;
  }

  connection._poolData.removed = true;

  if (typeof callback === 'undefined') {
    callback = function() {};
  }

  var isDisconnected = connection.state === 'disconnected';
  if (isDisconnected) {
    connection.destroy();
  }

  this._removeConnection(connection);

  if (!isDisconnected && !connection._protocol._quitSequence) {
    connection._realEnd(callback);
    return;
  }

  process.nextTick(callback);
  process.nextTick(this._handleWaitingCallbacksFn);
};

/**
 * Return the connection status.
 *
 * @return {Object}
 * @api public
 */

PoolConnectionManager.prototype.getStatus = function () {
  return {
    all : this._allConnections.size(),
    use : this._allConnections.size() - this._spareConnections.size(),
    spare : this._spareConnections.size(),
    waiting : this._waitingList.size()
  };
};

/**
 * Remove a connection from internal storages.
 *
 * @param {PoolConnection} connection
 * @api private
 */

PoolConnectionManager.prototype._removeConnection = function (connection) {
  if (connection._pool) {
    connection._pool = null;
    this._allConnections.remove(connection);
    this._spareConnections.remove(connection);
  }
};

/**
 * Update lastUsedTime, used of a connection.
 *
 * @param {PoolConnection} connection
 * @param {Boolean} used
 * @api private
 */

PoolConnectionManager.prototype._updateConnectionLastUsedTime = function (connection, used) {
  if (this._pingCheckInterval > 0) {
    connection._poolData.lastUsedTime = Date.now();
  }

  if (used !== undefined) {
    connection._poolData.used = used;
  }
};

/**
 * Handle one of the callbacks that are waiting.
 *
 * @api private
 */

PoolConnectionManager.prototype._handleWaitingCallbacks = function () {
  if (this._waitingList.isEmpty()) {
    return;
  }

  var connection = this.getSpareConnection();
  if (connection) {
    this.passConnectionToCallback(connection, this._waitingList.pick());
  } else if (this.canCreateNewConnection()) {
    this.createNewConnection(this._waitingList.pick());
  }
};

/**
 * Check if user is changed.
 *
 * @param {PoolConnection} connection
 * @return {Boolean}
 * @api private
 */

PoolConnectionManager.prototype._isChangedUser = function (connection) {
  var connConfig = connection.config;
  var poolConfig = this._config.connectionConfig;

  return connConfig.changedUser &&
    (connConfig.user !== poolConfig.user ||
    connConfig.database !== poolConfig.database ||
    connConfig.password !== poolConfig.password ||
    connConfig.charsetNumber !== poolConfig.charsetNumber);
};

/**
 * Prepare an initial starting connection.
 *
 * @param {number} startConnections
 * @api private
 */

PoolConnectionManager.prototype._prepareStartConnections = function (startConnections) {
  var self = this;

  var createdConnectionCount = 0;
  var step = 0;

  for (var i=1; i <= startConnections; i++) {
    this._createNewSpareConnectionForSystem(function(success) {
      if (success) {
        createdConnectionCount++;
      }

      if (++step === startConnections) {
        self._onPreparedStartConnections(createdConnectionCount);
      }
    });
  }
};

/**
 * Create a new spare connection
 *
 * @param {Function} callback
 * @api private
 */

PoolConnectionManager.prototype._createNewSpareConnectionForSystem = function (callback) {
  if (callback === undefined) {
    callback = function() {};
  }

  var pool = this._pool;
  var self = this;

  process.nextTick(function() {
    var connection = new PoolConnection(pool, { config: self._config.newConnectionConfig() });

    connection.connect(self._timeoutConfig, function onConnect(err) {
      if (pool._isClosed() || err) {
        callback(false);
        return;
      }

      self._updateConnectionLastUsedTime(connection, false);
      self._allConnections.add(connection);
      self._spareConnections.add(connection);
      pool.emit('connection', connection);
      callback(true);
    });
  });
};

/**
 * Called when `Pool` is ready.
 *
 * @param {number} createdConnectionCount
 * @api private
 */

PoolConnectionManager.prototype._onPreparedStartConnections = function (createdConnectionCount) {
  this._maxSpareConnections = Math.max(this._maxSpareConnections, this._minSpareConnections);

  if ((this._minSpareConnections > 0 || this._maxSpareConnections > 0) && this._config.spareCheckInterval) {
    var self = this;
    this._spareCheckHandle = setInterval(function() {
      self._handleSpareConnections();
    }, this._config.spareCheckInterval);
  }

  this._prepared = true;
  this._pool.emit('prepared', createdConnectionCount);

  if (createdConnectionCount > 0 && !this._waitingList.isEmpty()) {
    for(var i = 0, len = createdConnectionCount; i < len; i++) {
      process.nextTick(this._handleWaitingCallbacksFn);
    }
  }
};

/**
 * Handle spare connections.
 *
 * @api private
 */

PoolConnectionManager.prototype._handleSpareConnections = function() {
  // check minimum spare connections
  if (this._minSpareConnections > 0) {
    var createConnectionCount = this._minSpareConnections - this._spareConnections.size();
    if (createConnectionCount > 0) {
      while(createConnectionCount--) {
        this._createNewSpareConnectionForSystem();
      }
      return;
    }
  }

  // check maximum spare connections
  if (this._maxSpareConnections > 0) {
    var removeConnectionCount = this._spareConnections.size() - this._maxSpareConnections;
    if (removeConnectionCount > 0) {
      while(removeConnectionCount--) {
        var connection = this.getSpareConnection();
        if (connection) {
          this._removeConnection(connection);
          process.nextTick(function() {
            connection.destroy();
          });
        }
      }
    }
  }
};

/**
 * Raise error to callback.
 *
 * @param {Function} callback
 * @param {string} code
 * @param {string} message
 * @api private
 */

PoolConnectionManager.prototype._raiseError = function (callback, code, message) {
  if (callback) {
    var err = new Error(message);
    err.code = code;
    process.nextTick(function () {
      callback(err);
    });
  }
};

/**
 * Create a object for handling all connections.
 *
 * @api private
 */

PoolConnectionManager.prototype._createAllConnections = function () {
  return {
    _map: {},
    _size: 0,
    isEmpty: function() {
      return this._size === 0;
    },
    add: function(connection) {
      this._map[connection._poolData.id] = connection;
      this._size++;
    },
    set: function(connection) {
      this._map[connection._poolData.id] = connection;
    },
    getById: function(id) {
      return this._map[id];
    },
    remove: function(connection) {
      if (this._map[connection._poolData.id] !== undefined) {
        delete this._map[connection._poolData.id];
        this._size--;
      }
    },
    size: function() {
      return this._size;
    },
    destroy: function(destroyCallback) {
      if (this._size > 0) {
        var map = this._map;
        for (var id in map) {
          destroyCallback(map[id]);
        }

        this._map = {};
        this._size = 0;
      }
    }
  };
};

/**
 * Create a object for handling spare connections.
 *
 * @api private
 */

PoolConnectionManager.prototype._createSpareConnections = function () {
  return {
    _stack: [],
    _top: -1,
    isEmpty: function() {
      return this._top < 0;
    },
    add: function(connection) {
      this._stack[++this._top] = connection._poolData.id;
    },
    pick: function() {
      if (this._top < 0) {
        return null;
      }

      var id = this._stack[this._top];
      if (id === undefined) {
        return null;
      }

      this._stack[this._top--] = undefined;
      return id;
    },
    remove: function(connection) {
      var newStack = [];
      var top = this._top;
      var found = false;
      var targetId = connection._poolData.id;

      while(top--) {
        var checkId = this._stack[top];

        if (checkId === undefined) {
          break;
        }

        if (checkId === targetId) {
          found = true;
        } else {
          newStack.push(this._stack[top]);
        }
      }

      if (found) {
        this._stack = newStack;
        this._top--;
      }
    },
    size: function() {
      return this._top + 1;
    }
  };
};

/**
 * Create a object for handling waiting list (callback).
 *
 * @param {number} timeout
 * @api private
 */

PoolConnectionManager.prototype._createWaitingList = function (timeout) {
  return {
    _queue: [],
    _id : 1,
    _timerHandles : {},
    _timeout : timeout,
    isEmpty: function() {
      return this._queue.length === 0;
    },
    add: function(callback) {
      this._queue.push(this._makeCallback(callback));
    },
    pick: function() {
      var item = this._queue.shift();

      if (item) {
        this._clearTimer(item.id);
        return item.callback;
      } else {
        return item;
      }
    },
    rollback: function(callback) {
      this._queue.unshift(this._makeCallback(callback));
    },
    destroy: function(destroyCallback) {
      var queue = this._queue;

      for (var i = 0, len = queue.length; i < len; i++) {
        this._clearTimer(queue[i].id);
        destroyCallback(queue[i].callback);
      }

      this._queue = [];
    },
    size: function() {
      return this._queue.length;
    },
    _makeCallback: function(callback) {
      var queueItem = {
        id: this._id++,
        callback: callback
      };

      if (this._timeout > 0) {
        var self = this;
        var itemId = queueItem.id;
        this._timerHandles[itemId] = setTimeout(function() {
          self._onTimeout(itemId);
        }, this._timeout);
      }

      return queueItem;
    },
    _onTimeout: function(id) {
      this._clearTimer(id);

      var queue = this._queue;

      for (var i = 0, len = queue.length; i < len; i++) {
        if (queue[i].id === id) {
          var callback = queue[i].callback;
          queue.splice(i, 1);

          var timeoutError = new Error('Queue timeout occurred.');
          timeoutError.code = 'POOL_QUEUETIMEOUT';
          callback(timeoutError);
          break;
        }
      }
    },
    _clearTimer: function(id) {
      if (this._timerHandles[id] !== undefined) {
        clearTimeout(this._timerHandles[id]);
        delete this._timerHandles[id];
      }
    }
  };
};
