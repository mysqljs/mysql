var Constants = require('./Constants');

module.exports = MysqlClientConfig;
function MysqlClientConfig(options) {
  this.host     = options.host || 'localhost';
  this.port     = options.port || 3306;
  this.user     = options.user || undefined;
  this.password = options.password || undefined;
  this.database = options.database;
  this.debug    = options.debug;
  this.typeCast = (options.typeCast === undefined)
    ? true
    : options.typeCast;

  this.maxPacketSize = 0x01000000;
  this.charsetNumber = Constants.UTF8_UNICODE_CI;
  this.clientFlags =
    Constants.CLIENT_LONG_PASSWORD |
    Constants.CLIENT_FOUND_ROWS |
    Constants.CLIENT_LONG_FLAG |
    Constants.CLIENT_CONNECT_WITH_DB |
    Constants.CLIENT_ODBC |
    Constants.CLIENT_LOCAL_FILES |
    Constants.CLIENT_IGNORE_SPACE |
    Constants.CLIENT_PROTOCOL_41 |
    Constants.CLIENT_INTERACTIVE |
    Constants.CLIENT_IGNORE_SIGPIPE |
    Constants.CLIENT_TRANSACTIONS |
    Constants.CLIENT_RESERVED |
    Constants.CLIENT_SECURE_CONNECTION |
    Constants.CLIENT_MULTI_STATEMENTS |
    Constants.CLIENT_MULTI_RESULTS;
}
