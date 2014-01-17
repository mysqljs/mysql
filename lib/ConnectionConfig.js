var urlParse        = require('url').parse;
var ClientConstants = require('./protocol/constants/client');
var Charsets        = require('./protocol/constants/charsets');

module.exports = ConnectionConfig;
function ConnectionConfig(options) {
  if (typeof options === 'string') {
    options = ConnectionConfig.parseUrl(options);
  }

  this.host               = options.host || 'localhost';
  this.port               = options.port || 3306;
  this.localAddress       = options.localAddress;
  this.socketPath         = options.socketPath;
  this.user               = options.user || undefined;
  this.password           = options.password || undefined;
  this.database           = options.database;
  this.insecureAuth       = options.insecureAuth || false;
  this.supportBigNumbers  = options.supportBigNumbers || false;
  this.bigNumberStrings   = options.bigNumberStrings || false;
  this.dateStrings        = options.dateStrings || false;
  this.debug              = options.debug;
  this.trace              = options.trace !== false;
  this.stringifyObjects   = options.stringifyObjects || false;
  this.timezone           = options.timezone || 'local';
  this.flags              = options.flags || '';
  this.queryFormat        = options.queryFormat;
  this.pool               = options.pool || undefined;
  this.multipleStatements = options.multipleStatements || false; 
  this.typeCast           = (options.typeCast === undefined)
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
    : options.charsetNumber||Charsets.UTF8_GENERAL_CI;

  this.clientFlags = ConnectionConfig.mergeFlags(ConnectionConfig.getDefaultFlags(options),
                                                 options.flags || '');
}

ConnectionConfig.mergeFlags = function(default_flags, user_flags) {
  var flags = 0x0, i;

  user_flags = (user_flags || '').toUpperCase().split(/\s*,+\s*/);

  // add default flags unless "blacklisted"
  for (i in default_flags) {
    if (user_flags.indexOf("-" + default_flags[i]) >= 0) continue;

    flags |= ClientConstants["CLIENT_" + default_flags[i]] || 0x0;
  }
  // add user flags unless already already added
  for (i in user_flags) {
    if (user_flags[i][0] == "-") continue;
    if (default_flags.indexOf(user_flags[i]) >= 0) continue;

    flags |= ClientConstants["CLIENT_" + user_flags[i]] || 0x0;
  }

  return flags;
};

ConnectionConfig.getDefaultFlags = function(options) {
  var defaultFlags = [ "LONG_PASSWORD", "FOUND_ROWS", "LONG_FLAG",
                        "CONNECT_WITH_DB", "ODBC", "LOCAL_FILES",
                        "IGNORE_SPACE", "PROTOCOL_41", "IGNORE_SIGPIPE",
                        "TRANSACTIONS", "RESERVED", "SECURE_CONNECTION",
                        "MULTI_RESULTS" ];
  if (options && options.multipleStatements) {
    defaultFlags.push("MULTI_STATEMENTS");
  }

  return defaultFlags;
};

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
