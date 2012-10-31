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
  this.timezone     = options.timezone || 'local';
  this.flags        = options.flags || '';
  this.typeCast     = (options.typeCast === undefined)
    ? true
    : options.typeCast;
  if (this.timezone[0] == " ") {
    // "+" is a url encoded char for space so it
    // gets translated to space when giving a
    // connection string..
    this.timezone = "+" + this.timezone.substr(1);
  }

  this.maxPacketSize = 0;
  this.charsetNumber = (options.charset)
    ? ConnectionConfig.getCharsetNumber(options.charset)
    : Charsets.UTF8_GENERAL_CI;

  this.defaultFlags = [ "LONG_PASSWORD", "FOUND_ROWS", "LONG_FLAG",
                        "CONNECT_WITH_DB", "ODBC", "LOCAL_FILES",
                        "IGNORE_SPACE", "PROTOCOL_41", "IGNORE_SIGPIPE",
                        "TRANSACTIONS", "RESERVED", "SECURE_CONNECTION",
                        "MULTI_RESULTS" ];
  if (options.multipleStatements) {
    this.defaultFlags.push("MULTI_STATEMENTS");
  }

  var i;

  if (this.flags.length > 0) {
    this.flags = this.flags.toUpperCase().split(',');
  } else {
    this.flags = [];
  }

  this.clientFlags = 0x0;

  // add default flags unless "blacklisted"
  for (i in this.defaultFlags) {
    if (this.flags.indexOf("-" + this.defaultFlags[i]) >= 0) continue;

    this.clientFlags |= ClientConstants["CLIENT_" + this.defaultFlags[i]] || 0x0;
  }
  // add user flags unless already already added
  for (i in this.flags) {
    if (this.flags[i][0] == "-") continue;
    if (this.defaultFlags.indexOf(this.flags[i]) >= 0) continue;

    this.clientFlags |= ClientConstants["CLIENT_" + this.flags[i]] || 0x0;
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
