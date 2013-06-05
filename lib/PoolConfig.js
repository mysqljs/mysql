
var ConnectionConfig = require('./ConnectionConfig');

module.exports = PoolConfig;
function PoolConfig(options) {
  this.connectionConfig   = new ConnectionConfig(options);
  this.createConnection   = options.createConnection || undefined;
  this.waitForConnections = (options.waitForConnections === undefined)
    ? true
    : Boolean(options.waitForConnections);
  this.connectionLimit    = (options.connectionLimit === undefined)
    ? 10
    : Number(options.connectionLimit);
  this.queueLimit         = (options.queueLimit === undefined)
    ? 0
    : Number(options.queueLimit);
  this.maxWait            = (options.maxWait === undefined)
    ? 0
    : Number(options.maxWait);
  this.initialSize        = (options.initialSize === undefined)
    ? 0
    : Number(options.initialSize);
  this.minIdle            = (options.minIdle === undefined)
    ? 0
    : Number(options.minIdle);
  this.maxIdle            = (options.maxIdle === undefined)
    ? 0
    : Number(options.maxIdle);
  this.idleCheckInterval  = (options.idleCheckInterval === undefined)
    ? 600000 // 10 minutes
    : Number(options.idleCheckInterval);
  this.idleCheckNumPerRun = (options.idleCheckNumPerRun === undefined)
    ? 3
    : Number(options.idleCheckNumPerRun);
}
