module.exports = MysqlClientConfig;
function MysqlClientConfig(options) {
  this.host     = options.host || 'localhost';
  this.user     = options.user || undefined;
  this.password = options.password || undefined;
  this.port     = options.port || 3306;
}
