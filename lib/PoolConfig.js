
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
}
