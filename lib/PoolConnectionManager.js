var PoolConnection = require('./PoolConnection');
var PoolConnectionManagerData = require('./PoolConnectionManagerData');

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
  this._prepared = false;

  // Frequently used variables
  this._neverWaitForConnections = !config.waitForConnections;
  this._connectionLimit = config.connectionLimit;
  this._queueLimit = config.queueLimit;
  this._testOnBorrow = config.testOnBorrow;
  this._testOnBorrowInterval = config.testOnBorrowInterval;
  this._maxIdle = config.maxIdle;
  this._maxReuseCount = config.maxReuseCount;
  this._timeoutConfig = {
    timeout: config.acquireTimeout
  };

  this._handleQueuedCallbacksRef = this._handleQueuedCallbacks.bind(this);
  this._evictionTimerRef = this._evictionTimer.bind(this);
  this._startEvitionTimerRef = this._startEvitionTimer.bind(this);

  // Variables for handling connections and callbacks
  this._allConnection = new PoolConnectionManagerData.AllConnection();
  this._idleConnection = new PoolConnectionManagerData.IdleConnection();
  this._callbackQueue = new PoolConnectionManagerData.CallbackQueue(config.queueTimeout);

  this._createInitialConnections(config.initialSize);
}

/**
 * Checks if `Pool` is prepared.
 *
 * @return {boolean}
 * @api public
 */

PoolConnectionManager.prototype.isPrepared = function () {
  return this._prepared;
};

/**
 * Returns the idle connection.
 * If there's no idle connection, return null.
 *
 * @returns {Object|null}
 * @api public
 */

PoolConnectionManager.prototype.getIdleConnection = function () {
  if (this._idleConnection.isEmpty()) {
    return null;
  }

  var id = this._idleConnection.pop();
  var connection = this._allConnection.get(id);

  if (connection) {
    connection.increaseReuseCount();
  }

  return connection;
};

/**
 * Executes the callback with the acquired connection.
 *
 * @return {Function} callback
 * @param {PoolConnection} connection
 * @api public
 */

PoolConnectionManager.prototype.executeCallback = function (callback, connection) {
  var pool = this._pool;
  var self = this;

  if (!connection.isSamePool(pool)) {
    this._raiseError(callback, 'POOL_ERROR', 'Connection acquired from wrong pool.');
    return;
  }

  // If user is changed
  var changedUser = this._isChangedUser(connection);

  if (changedUser) {
    // Restores user back to pool configuration
    connection.config = this._config.newConnectionConfig();
    connection.changeUser(this._timeoutConfig, onOperationComplete);
    return;
  }

  if (!this._testOnBorrow) {
    process.nextTick(function() {
      self._executeCallbackDirectly(callback, connection);
    });
    return;
  }

  // Reuse recently used connections without ping check.
  if (this._testOnBorrowInterval > 0 && Date.now() - connection.getLastUsedTime() < this._testOnBorrowInterval) {
    process.nextTick(function() {
      if (connection.isRemoved()) {
        connection.ping(self._timeoutConfig, onOperationComplete);
      } else {
        self._executeCallbackDirectly(callback, connection);
      }
    });
  } else {
    connection.ping(this._timeoutConfig, onOperationComplete);
  }

  function onOperationComplete(err) {
    if (pool._isClosed(callback)) {
      return;
    }

    if (err) {
      self.purgeConnection(connection);
      self._callbackQueue.rollback(callback);
      process.nextTick(self._handleQueuedCallbacksRef);
      return;
    }

    if (changedUser) {
      connection.config.changedUser = false;
      pool.emit('connection', connection);
    }

    self._executeCallbackDirectly(callback, connection);
  }
};

PoolConnectionManager.prototype._executeCallbackDirectly = function (callback, connection) {
  connection.setUsed(true);
  this._pool.emit('acquire', connection);
  callback(null, connection);
};

/**
 * Checks if `Pool` can create a new connection.
 *
 * @return {Boolean}
 * @api public
 */

PoolConnectionManager.prototype.canCreateNewConnection = function () {
  return (this._connectionLimit === 0 || this._allConnection.size() < this._connectionLimit);
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

  self._allConnection.add(connection);

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
    pool.emit('acquire', connection);

    callback(null, connection);
  });
};

/**
 * Puts the callback into the queue.
 * The callback is handled when possible.
 *
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.putCallbackToQueue = function (callback) {
  if (this._neverWaitForConnections) {
    this._raiseError(callback, 'POOL_CONNLIMIT', 'No connections available.');
    return;
  }

  if (this._queueLimit && this._callbackQueue.size() >= this._queueLimit) {
    this._raiseError(callback, 'POOL_ENQUEUELIMIT', 'Queue limit reached.');
    return;
  }

  // Binds to domain, as dequeue will likely occur in a different domain
  if (process.domain) {
    this._callbackQueue.add(process.domain.bind(callback));
  } else {
    this._callbackQueue.add(callback);
  }

  this._pool.emit('enqueue');
};

/**
 * Releases a used connection.
 *
 * @param {PoolConnection} connection
 * @api public
 */

PoolConnectionManager.prototype.releaseConnection = function (connection) {
  if (!connection.isUsed()) {
    throw new Error('Connection already released');
  }

  if (!this._callbackQueue.isEmpty()) {
    this.executeCallback(this._callbackQueue.pop(), connection);
    return;
  }

  if ((this._maxReuseCount > 0 && connection.getReuseCount() >= this._maxReuseCount) ||
      (this._maxIdle > 0 && this._idleConnection.size() >= this._maxIdle)) {
    this._removeConnection(connection, true);
  } else {
    connection.updateLastUsedTime();
    connection.setUsed(false);
    this._idleConnection.add(connection);
    this._pool.emit('release', connection);
  }
};

/**
 * Destroys all.
 *
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.destroy = function (callback) {
  if (this._evictionTimerHandle) {
    clearTimeout(this._evictionTimerHandle);
  }

  // throws error to waiting connections
  var self = this;

  this._callbackQueue.destroy(function (queuedCallback) {
    self._raiseError(queuedCallback, 'POOL_CLOSED', 'Pool is closed.');
  });

  var allConnectionsSize = this._allConnection.size();
  if (allConnectionsSize === 0) {
    callback();
    return;
  }

  // purges all connections
  var calledBack = false;
  function onEndPurge(err) {
    if (!calledBack && (err || --allConnectionsSize <= 0)) {
      calledBack = true;
      callback(err);
    }
  }

  this._allConnection.destroy(function (connection) {
    self.purgeConnection(connection, onEndPurge);
  });
};

/**
 * Purges the connection from `Pool`.
 *
 * @param {PoolConnection} connection
 * @param {Function} callback
 * @api public
 */

PoolConnectionManager.prototype.purgeConnection = function (connection, callback) {
  if (connection.isRemoved()) {
    return;
  }

  connection.setRemoved(true);

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
};

/**
 * Returns the status of `Pool`.
 *
 * @return {Object}
 * @api public
 */

PoolConnectionManager.prototype.getStatus = function () {
  return {
    all   : this._allConnection.size(),
    use   : this._allConnection.size() - this._idleConnection.size(),
    idle  : this._idleConnection.size(),
    queue : this._callbackQueue.size()
  };
};

/**
 * Removes the connection.
 *
 * @param {PoolConnection} connection
 * @api private
 */

PoolConnectionManager.prototype._removeConnection = function (connection, destory) {
  if (connection.hasPool()) {
    connection.detachPool();
    this._allConnection.remove(connection);
    this._idleConnection.remove(connection);

    if (destory) {
      process.nextTick(connection.destroy.bind(connection));
    }
  }
};

/**
 * Handles one of the callbacks that are waiting for the connection.
 *
 * @api private
 */

PoolConnectionManager.prototype._handleQueuedCallbacks = function () {
  if (this._callbackQueue.isEmpty()) {
    return;
  }

  var connection = this.getIdleConnection();
  if (connection) {
    this.executeCallback(this._callbackQueue.pop(), connection);
  } else if (this.canCreateNewConnection()) {
    this.createNewConnection(this._callbackQueue.pop());
  }
};

/**
 * Checks if user is changed.
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
 * Creates initial connections.
 *
 * @param {number} initialSize
 * @api private
 */

PoolConnectionManager.prototype._createInitialConnections = function (initialSize) {
  this._prepared = false;

  if (initialSize === 0) {
    this._onPreparedInitialConnections(0);
    return;
  }

  var self = this;
  var createdConnectionCount = 0;
  var step = 0;

  function onCreatedConnection(success) {
    if (success) {
      createdConnectionCount++;
    }

    if (++step === initialSize) {
      self._onPreparedInitialConnections(createdConnectionCount);
    }
  }

  for (var i = 1; i <= initialSize; i++) {
    this._createNewIdleConnection(onCreatedConnection);
  }
};

/**
 * Creates a new idle connection.
 *
 * @param {Function} callback
 * @api private
 */

PoolConnectionManager.prototype._createNewIdleConnection = function (callback) {
  var pool = this._pool;
  var self = this;

  var connection = new PoolConnection(pool, { config: this._config.newConnectionConfig() });

  connection.connect(this._timeoutConfig, function onConnect(err) {
    if (pool._isClosed() || err) {
      if (callback) {
        callback(false);
      }
      return;
    }

    connection.setUsed(false);

    self._allConnection.add(connection);
    self._idleConnection.add(connection);
    pool.emit('connection', connection);

    if (callback) {
      callback(true);
    }
  });
};

/**
 * Called when `Pool` is ready.
 *
 * @param {number} createdConnectionCount
 * @api private
 */

PoolConnectionManager.prototype._onPreparedInitialConnections = function (createdConnectionCount) {
  this._prepared = true;

  this._pool.emit('prepared', createdConnectionCount);

  if (createdConnectionCount > 0 && !this._callbackQueue.isEmpty()) {
    for (var i = 0; i < createdConnectionCount; i++) {
      process.nextTick(this._handleQueuedCallbacksRef);
    }
  }

  // starts idle connection evictor timer
  if (this._config.timeBetweenEvictionRunsMillis > 0) {
    this._startEvitionTimer();
  }
};

PoolConnectionManager.prototype._startEvitionTimer = function () {
  if (this._evictionTimerHandle) {
    clearTimeout(this._evictionTimerHandle);
    this._evictionTimerHandle = null;
  }

  this._evictionTimerHandle = setTimeout(this._evictionTimerRef, this._config.timeBetweenEvictionRunsMillis);
};

PoolConnectionManager.prototype._evictionTimer = function () {
  var removedConnection = this._evictIdle();
  var createdConnection = this._ensureMinIdle(this._startEvitionTimerRef);

  this._pool.emit('eviction', {
    removed : removedConnection,
    created : createdConnection
  });
};

/**
 * Evicts idle connection.
 *
 * @api private
 */

PoolConnectionManager.prototype._evictIdle = function () {
  var minEvictableIdleTimeMillis = this._config.minEvictableIdleTimeMillis;
  if (minEvictableIdleTimeMillis <= 0) {
    return 0;
  }

  var idleConnectionCount = this._idleConnection.size();
  if (idleConnectionCount === 0) {
    return 0;
  }

  var targetConnectionCount = Math.min(this._config.numTestsPerEvictionRun, idleConnectionCount);
  var targetConnections = this._idleConnection.lookup(targetConnectionCount);

  var checkTime = Date.now() - minEvictableIdleTimeMillis;
  var removedConnection = 0;

  for (var i = 0; i < targetConnections.length; i++) {
    var id = targetConnections[i];
    var connection = this._allConnection.get(id);

    if (!connection || connection.getLastUsedTime() < checkTime) {
      this._removeConnection(connection, true);
      removedConnection++;
    }
  }

  return removedConnection;
};

/**
 * Checks if `Pool` has the minimum number of connections.
 * Creates new connections if it's insufficient.
 *
 * @api private
 */

PoolConnectionManager.prototype._ensureMinIdle = function (callback) {
  var minIdle = this._config.minIdle;
  if (minIdle <= 0) {
    callback();
    return 0;
  }

  var newConnectionCount = minIdle - this._idleConnection.size();
  if (newConnectionCount <= 0) {
    callback();
    return 0;
  }

  var step = 0;
  function onCreatedConnection() {
    if (++step === newConnectionCount) {
      callback();
    }
  }

  for (var i = 0; i < newConnectionCount; i++) {
    this._createNewIdleConnection(onCreatedConnection);
  }

  return newConnectionCount;
};

/**
 * Raises the error to callback.
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
