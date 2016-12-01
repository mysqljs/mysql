
var ConnectionConfig = require('./ConnectionConfig');

module.exports = PoolConfig;
function PoolConfig(options) {
  if (typeof options === 'string') {
    options = ConnectionConfig.parseUrl(options);
  }

  this.connectionConfig = new ConnectionConfig(options);

  this.acquireTimeout = this._getPropertyNumber(options.acquireTimeout, 10 * 1000);
  this.waitForConnections = this._getPropertyBoolean(options.waitForConnections, true);
  this.connectionLimit = this._getPropertyNumber(options.connectionLimit, 10);
  this.queueLimit = this._getPropertyNumber(options.queueLimit, 0);
  this.queueWaitTimeout = this._getPropertyNumber(options.queueWaitTimeout, 0);
  this.pingCheckInterval = this._getPropertyNumber(options.pingCheckInterval, 0);
  this.startConnections = this._getPropertyNumber(options.startConnections, 0);
  this.minSpareConnections = this._getPropertyNumber(options.minSpareConnections, 0);
  this.maxSpareConnections = this._getPropertyNumber(options.maxSpareConnections, 0);
  this.spareCheckInterval = this._getPropertyNumber(options.spareCheckInterval, 0);
}

PoolConfig.prototype._getPropertyNumber = function _getPropertyNumber(value, defaultValue) {
  return value === undefined ? defaultValue : Number(value);
};

PoolConfig.prototype._getPropertyBoolean = function _getPropertyBoolean(value, defaultValue) {
  return value === undefined ? defaultValue : Boolean(value);
};

PoolConfig.prototype.newConnectionConfig = function newConnectionConfig() {
  var newConfig = {};
  var connectionConfig = this.connectionConfig;

  for (var key in connectionConfig) {
    if (connectionConfig.hasOwnProperty(key)) {
      newConfig[key] = connectionConfig[key];
    }
  }

  return newConfig;
};
