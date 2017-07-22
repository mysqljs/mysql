
var ConnectionConfig = require('./ConnectionConfig');

module.exports = PoolConfig;
function PoolConfig(options) {
  if (typeof options === 'string') {
    options = ConnectionConfig.parseUrl(options);
  }

  this.connectionConfig = new ConnectionConfig(options);

  this.acquireTimeout = this._getPropertyNumber(options.acquireTimeout, 10000);
  this.waitForConnections = this._getPropertyBoolean(options.waitForConnections, true);
  this.connectionLimit = this._getPropertyNumber(options.connectionLimit, 10);
  this.queueLimit = this._getPropertyNumber(options.queueLimit, 0);
  this.queueTimeout = this._getPropertyNumber(options.queueTimeout, 0);
  this.testOnBorrow = this._getPropertyBoolean(options.testOnBorrow, true);
  this.testOnBorrowInterval = this._getPropertyNumber(options.testOnBorrowInterval, 20000);
  this.initialSize = this._getPropertyNumber(options.initialSize, 0);
  this.maxIdle = Math.min(this.connectionLimit, this._getPropertyNumber(options.maxIdle, 10));
  this.minIdle = Math.min(this.connectionLimit, this._getPropertyNumber(options.minIdle, 0));
  this.maxReuseCount = this._getPropertyNumber(options.maxReuseCount, 0);
  this.timeBetweenEvictionRunsMillis = this._getPropertyNumber(options.timeBetweenEvictionRunsMillis, 0);
  this.numTestsPerEvictionRun = this._getPropertyNumber(options.numTestsPerEvictionRun, 3);
  this.minEvictableIdleTimeMillis = this._getPropertyNumber(options.minEvictableIdleTimeMillis, 1800000);
}

PoolConfig.prototype.newConnectionConfig = function () {
  var newConfig = {};
  var connectionConfig = this.connectionConfig;

  for (var key in connectionConfig) {
    if (connectionConfig.hasOwnProperty(key)) {
      newConfig[key] = connectionConfig[key];
    }
  }

  return newConfig;
};

PoolConfig.prototype._getPropertyNumber = function (value, defaultValue) {
  return value === undefined ? defaultValue : Number(value);
};

PoolConfig.prototype._getPropertyBoolean = function (value, defaultValue) {
  return value === undefined ? defaultValue : Boolean(value);
};
