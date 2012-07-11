var urlParse        = require('url').parse;
var ClientConstants = require('./protocol/constants/client');
var Charsets        = require('./protocol/constants/charsets');

module.exports = ConnectionConfig;
function ConnectionConfig(options) {
  if (typeof options === 'string') {
    options = ConnectionConfig.parseUrl(options);
  }

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
    ? ConnectionConfig.getCharsetNumber(options.charset)
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

ConnectionConfig.getCharsetNumber = function(charset) {
  return Charsets[charset];
};

ConnectionConfig.parseUrl = function(url) {
  url = urlParse(url, true);

  var options = {
    host     : url.hostname,
    port     : url.port,
    database : url.pathname.substr(1),
  };

  if (url.auth) {
    var auth = url.auth.split(':');
    options.user     = auth[0];
    options.password = auth[1];
  }

  if (url.query) {
    for (var key in url.query) {
      var value = url.query[key];

      try {
        // Try to parse this as a JSON expression first
        options[key] = JSON.parse(value);
      } catch (err) {
        // Otherwise assume it is a plain string
        options[key] = value;
      }
    }
  }

  return options;
};
