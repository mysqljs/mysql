var ClientConstants = require('./protocol/constants/client');
var Charsets        = require('./protocol/constants/charsets');

module.exports = Config;
function Config(options) {
  this.host         = options.host || 'localhost';
  this.port         = options.port || 3306;
  this.socketPath   = options.socketPath;
  this.user         = options.user || undefined;
  this.password     = options.password || undefined;
  this.database     = options.database;
  this.insecureAuth = options.insecureAuth || false;
  this.debug        = options.debug;
  this.typeCast     = (options.typeCast === undefined)
    ? true
    : options.typeCast;

  this.maxPacketSize = 0;
  this.charsetNumber = (options.charset)
    ? Charsets[options.charset]
    : Charsets.UTF8_GENERAL_CI;

  this.clientFlags =
    ClientConstants.CLIENT_LONG_PASSWORD |
    ClientConstants.CLIENT_FOUND_ROWS |
    ClientConstants.CLIENT_LONG_FLAG |
    ClientConstants.CLIENT_CONNECT_WITH_DB |
    ClientConstants.CLIENT_ODBC |
    ClientConstants.CLIENT_LOCAL_FILES |
    ClientConstants.CLIENT_IGNORE_SPACE |
    ClientConstants.CLIENT_PROTOCOL_41 |
    ClientConstants.CLIENT_IGNORE_SIGPIPE |
    ClientConstants.CLIENT_TRANSACTIONS |
    ClientConstants.CLIENT_RESERVED |
    ClientConstants.CLIENT_SECURE_CONNECTION |
    ClientConstants.CLIENT_MULTI_RESULTS;

  if (options.multipleStatements) {
    this.clientFlags |= ClientConstants.CLIENT_MULTI_STATEMENTS;
  }
}
