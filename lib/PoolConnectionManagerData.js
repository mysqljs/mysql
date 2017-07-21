var PoolConnectionManagerData = module.exports = {};

/**
 * AllConnection : handling all connections.
 */

var AllConnection = PoolConnectionManagerData.AllConnection = function() {
  this._map = {};
  this._size = 0;
};

AllConnection.prototype.add = function(connection) {
  this._map[connection.getId()] = connection;
  this._size++;
};

AllConnection.prototype.set = function(connection) {
  this._map[connection.getId()] = connection;
};

AllConnection.prototype.remove = function(connection) {
  if (this._map[connection.getId()] !== undefined) {
    delete this._map[connection.getId()];
    this._size--;
  }
};

AllConnection.prototype.get = function(id) {
  return this._map[id] || null;
};

AllConnection.prototype.isEmpty = function() {
  return this._size === 0;
};

AllConnection.prototype.size = function() {
  return this._size;
};

AllConnection.prototype.destroy = function(destroyCallback) {
  if (this._size > 0) {
    if (destroyCallback) {
      var map = this._map;
      for (var id in map) {
        destroyCallback(map[id]);
      }
    }

    this._map = {};
    this._size = 0;
  }
};

/**
 * IdleConnection : handling idle connections.
 */

var IdleConnection = PoolConnectionManagerData.IdleConnection = function() {
  this._stack = [];
};

IdleConnection.prototype.add = function(connection) {
  this._stack.push(connection.getId());
};

IdleConnection.prototype.remove = function(connection) {
  var index = this._stack.indexOf(connection.getId());

  if (index !== -1) {
    this._stack.splice(index, 1);
  }
};

IdleConnection.prototype.pop = function() {
  return this._stack.pop() || null;
};

IdleConnection.prototype.isEmpty = function() {
  return this._stack.length === 0;
};

IdleConnection.prototype.size = function() {
  return this._stack.length;
};

IdleConnection.prototype.lookup = function(num) {
  return this._stack.slice(0, num);
};

/**
 * CallbackQueue : handling queued callbacks.
 *
 * @param {number} timeout
 */

var CallbackQueue = PoolConnectionManagerData.CallbackQueue = function(timeout) {
  this._queue = [];
  this._id = 1;
  this._timerHandles = {};
  this._timeout = timeout;
};

CallbackQueue.prototype.add = function(callback) {
  this._queue.push(this._makeCallback(callback));
};

CallbackQueue.prototype.pop = function() {
  var item = this._queue.shift();

  if (item) {
    this._clearTimer(item.id);
    return item.callback;
  } else {
    return item;
  }
};

CallbackQueue.prototype.rollback = function(callback) {
  this._queue.unshift(this._makeCallback(callback));
};

CallbackQueue.prototype.isEmpty = function() {
  return this._queue.length === 0;
};

CallbackQueue.prototype.size = function() {
  return this._queue.length;
};

CallbackQueue.prototype.destroy = function(destroyCallback) {
  var queue = this._queue;

  for (var i = 0, len = queue.length; i < len; i++) {
    this._clearTimer(queue[i].id);

    if (destroyCallback) {
      destroyCallback(queue[i].callback);
    }
  }

  this._queue = [];
  this._id = 1;
};

CallbackQueue.prototype._makeCallback = function(callback) {
  var queueItem = {
    id       : this._id++,
    callback : callback
  };

  if (this._timeout > 0) {
    var self = this;
    var itemId = queueItem.id;
    this._timerHandles[itemId] = setTimeout(function() {
      self._onTimeout(itemId);
    }, this._timeout);
  }

  return queueItem;
};

CallbackQueue.prototype._onTimeout = function(id) {
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
};

CallbackQueue.prototype._clearTimer = function(id) {
  if (this._timeout > 0 && this._timerHandles[id] !== undefined) {
    clearTimeout(this._timerHandles[id]);
    delete this._timerHandles[id];
  }
};
