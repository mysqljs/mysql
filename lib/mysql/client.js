if (global.GENTLY) require = GENTLY.hijack(require);

var util = require('util'),
    Stream = require('net').Stream,
    auth = require('./auth'),
    Parser = require('./parser'),
    OutgoingPacket = require('./outgoing_packet'),
    Query = require('./query'),
    EventEmitter = require('events').EventEmitter;

function Client(properties) {
  if (!(this instanceof Client)) {
    return new Client(properties);
  }

  EventEmitter.call(this);

  this.host = 'localhost';
  this.port = 3306;
  this.user = null;
  this.password = null;
  this.database = '';

  this.typeCast = true;
  this.flags = Client.defaultFlags;
  this.maxPacketSize = 0x01000000;
  this.charsetNumber = Client.UTF8_UNICODE_CI;
  this.debug = false;
  this.ending = false;
  this.connected = false;

  this._greeting = null;
  this._queue = [];
  this._connection = null;
  this._parser = null;

  for (var key in properties) {
    this[key] = properties[key];
  }
};
util.inherits(Client, EventEmitter);
module.exports = Client;

Client.prototype.connect = function(cb) {
  var self = this;
  this._enqueue(function connect() {
    var connection = self._connection = new Stream(),
        parser = self._parser = new Parser();

    connection
      .on('error', function(err) {
        var connectionError = err.code && err.code.match(/ECONNREFUSED|ENOTFOUND/);
        if (connectionError) {
          if (cb) {
            cb(err);
            return;
          }
        }

        self.emit('error', err);
      })
      .on('data', function(b) {
        parser.write(b);
      })
      .on('end', function() {
        if (self.ending) {
          self.connected = false;
          self.ending = false;
          return;
        }

        if (!self.connected) {
          return;
        }

        self.connected = false;
        self._prequeue(connect);
      });
    connection.connect(self.port, self.host);

    parser
      .on('packet', function(packet) {
        self._handlePacket(packet);
      });
  }, cb);
};

Client.prototype.query = function(sql, params, cb) {
  var self = this;

  if (Array.isArray(params)) {
    sql = this.format(sql, params);
  } else {
    cb = arguments[1];
  }

  var query = new Query({
    typeCast: this.typeCast,
    sql: sql
  });

  if (cb) {
    var rows = [], fields = {};
    query
      .on('error', function(err) {
        cb(err);
        self._dequeue();
      })
      .on('field', function(field) {
        fields[field.name] = field;
      })
      .on('row', function(row) {
        rows.push(row);
      })
      .on('end', function(result) {
        if (result) {
          cb(null, result);
        } else {
          cb(null, rows, fields);
        }

        self._dequeue();
      });
  } else {
    query
      .on('error', function(err) {
        if (query.listeners('error').length <= 1) {
          self.emit('error', err);
        }
        self._dequeue();
      })
      .on('end', function(result) {
        self._dequeue();
      });
  }

  this._enqueue(function query() {
    var packet = new OutgoingPacket(1 + Buffer.byteLength(sql, 'utf-8'));

    packet.writeNumber(1, Client.COM_QUERY);
    packet.write(sql, 'utf-8');
    self.write(packet);
  }, query);

  return query;
};

Client.prototype.write = function(packet) {
  if (this.debug) {
    console.log('-> %s', packet.buffer.inspect());
  }

  this._connection.write(packet.buffer);
};

Client.prototype.format = function(sql, params) {
  var escape = this.escape;
  sql = sql.replace(/\?/g, function() {
    if (params.length == 0) {
      throw new Error('too few parameters given');
    }

    return escape(params.shift());
  });

  if (params.length) {
    throw new Error('too many parameters given');
  }

  return sql;
};

Client.prototype.escape = function(val) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? 'true' : 'false';
    case 'number': return val+'';
  }

  if (typeof val === 'object') {
    val = val.toString();
  }

  val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
    switch(s) {
      case "\0": return "\\0";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\b": return "\\b";
      case "\t": return "\\t";
      case "\x1a": return "\\Z";
      default: return "\\"+s;
    }
  });
  return "'"+val+"'";
};

Client.prototype.ping = function(cb) {
  var self = this;
  this._enqueue(function ping() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, Client.COM_PING);
    self.write(packet);
  }, cb);
};

Client.prototype.statistics = function(cb) {
  var self = this;
  this._enqueue(function ping() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, Client.COM_STATISTICS);
    self.write(packet);
  }, cb);
};

Client.prototype.useDatabase = function(database, cb) {
  var self = this;
  this._enqueue(function ping() {
    var packet = new OutgoingPacket(1 + Buffer.byteLength(database, 'utf-8'));
    packet.writeNumber(1, Client.COM_INIT_DB);
    packet.write(database, 'utf-8');
    self.write(packet);
  }, cb);
};

Client.prototype.destroy = function() {
  this._connection.destroy();
}

Client.prototype.end = function(cb) {
  var self = this;

  this.ending = true;

  this._enqueue(function end() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, Client.COM_QUIT);
    self.write(packet);
    if (cb) {
      self._connection.on('end', cb);
    }

    self._dequeue();
  });
};

Client.prototype._prequeue = function(fn, delegate) {
  this._queue.unshift({fn: fn, delegate: delegate});
  fn();
};

Client.prototype._enqueue = function(fn, delegate) {
  this._queue.push({fn: fn, delegate: delegate});
  if (this._queue.length == 1) {
    fn();
  }
};

Client.prototype._dequeue = function() {
  this._queue.shift();

  if (!this._queue.length) {
    return;
  }

  this._queue[0].fn();
};

Client.prototype._handlePacket = function(packet) {
  if (this.debug) {
    this._debugPacket(packet);
  }

  if (packet.type == Parser.GREETING_PACKET) {
    this._sendAuth(packet);
    return;
  }

  if (packet.type == Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET) {
    this._sendOldAuth(this._greeting);
    return;
  }

  var type = packet.type,
      task = this._queue[0],
      delegate = (task)
        ? task.delegate
        : null;

  if (delegate instanceof Query) {
    delegate._handlePacket(packet);
    return;
  }

  if (type != Parser.ERROR_PACKET) {
    this.connected = true;
    if (delegate) {
      delegate(null, Client._packetToUserObject(packet));
    }
  } else {
    packet = Client._packetToUserObject(packet);
    if (delegate) {
      delegate(packet);
    } else {
      this.emit('error', packet);
    }
  }
  this._dequeue();
};

Client.prototype._sendAuth = function(greeting) {
  var token = auth.token(this.password, greeting.scrambleBuffer),
      packetSize = (
        4 + 4 + 1 + 23 +
        this.user.length + 1 +
        token.length + 1 +
        this.database.length + 1
      ),
      packet = new OutgoingPacket(packetSize, greeting.number+1);

  packet.writeNumber(4, this.flags);
  packet.writeNumber(4, this.maxPacketSize);
  packet.writeNumber(1, this.charsetNumber);
  packet.writeFiller(23);
  packet.writeNullTerminated(this.user);
  packet.writeLengthCoded(token);
  packet.writeNullTerminated(this.database);

  this.write(packet);

  // Keep a reference to the greeting packet. We might receive a
  // USE_OLD_PASSWORD_PROTOCOL_PACKET as a response, in which case we will need
  // the greeting packet again. See _sendOldAuth()
  this._greeting = greeting;
};

Client._packetToUserObject = function(packet) {
  var userObject = (packet.type == Parser.ERROR_PACKET)
    ? new Error()
    : {};

  for (var key in packet) {
    var newKey = key;
    if (key == 'type' || key == 'number' || key == 'length' || key == 'received') {
      continue;
    }

    if (key == 'errorMessage') {
      newKey = 'message';
    } else if (key == 'errorNumber') {
      newKey = 'number';
    }

    userObject[newKey] = packet[key];
  }

  return userObject;
};

Client.prototype._debugPacket = function(packet) {
  var packetName = null;
  for (var key in Parser) {
    if (!key.match(/_PACKET$/)) {
      continue;
    }

    if (Parser[key] == packet.type) {
      packetName = key;
      break;
    }
  }
  console.log('<- %s: %j', packetName, packet);
};

Client.prototype._sendOldAuth = function(greeting) {
  var token = auth.scramble323(greeting.scrambleBuffer, this.password),
      packetSize = (
        token.length + 1
      ),
      packet = new OutgoingPacket(packetSize, greeting.number+3);

  // I could not find any official documentation for this, but from sniffing
  // the mysql command line client, I think this is the right way to send the
  // scrambled token after receiving the USE_OLD_PASSWORD_PROTOCOL_PACKET.
  packet.write(token);
  packet.writeFiller(1);

  this.write(packet);
};

// Client Flags
Client.LONG_PASSWORD     = 1;
Client.FOUND_ROWS        = 2;
Client.LONG_FLAG         = 4;
Client.CONNECT_WITH_DB   = 8;
Client.NO_SCHEMA         = 16;
Client.COMPRESS          = 32;
Client.ODBC              = 64;
Client.LOCAL_FILES       = 128;
Client.IGNORE_SPACE      = 256;
Client.PROTOCOL_41       = 512;
Client.INTERACTIVE       = 1024;
Client.SSL               = 2048;
Client.IGNORE_SIGPIPE    = 4096;
Client.TRANSACTIONS      = 8192;
Client.RESERVED          = 16384;
Client.SECURE_CONNECTION = 32768;
Client.MULTI_STATEMENTS  = 65536;
Client.MULTI_RESULTS     = 131072;

Client.defaultFlags =
    Client.LONG_PASSWORD
  | Client.FOUND_ROWS
  | Client.LONG_FLAG
  | Client.CONNECT_WITH_DB
  | Client.ODBC
  | Client.LOCAL_FILES
  | Client.IGNORE_SPACE
  | Client.PROTOCOL_41
  | Client.INTERACTIVE
  | Client.IGNORE_SIGPIPE
  | Client.TRANSACTIONS
  | Client.RESERVED
  | Client.SECURE_CONNECTION
  | Client.MULTI_STATEMENTS
  | Client.MULTI_RESULTS;

// Commands
Client.COM_SLEEP               = 0x00;
Client.COM_QUIT                = 0x01;
Client.COM_INIT_DB             = 0x02;
Client.COM_QUERY               = 0x03;
Client.COM_FIELD_LIST          = 0x04;
Client.COM_CREATE_DB           = 0x05;
Client.COM_DROP_DB             = 0x06;
Client.COM_REFRESH             = 0x07;
Client.COM_SHUTDOWN            = 0x08;
Client.COM_STATISTICS          = 0x09;
Client.COM_PROCESS_INFO        = 0x0a;
Client.COM_CONNECT             = 0x0b;
Client.COM_PROCESS_KILL        = 0x0c;
Client.COM_DEBUG               = 0x0d;
Client.COM_PING                = 0x0e;
Client.COM_TIME                = 0x0f;
Client.COM_DELAYED_INSERT      = 0x10;
Client.COM_CHANGE_USER         = 0x11;
Client.COM_BINLOG_DUMP         = 0x12;
Client.COM_TABLE_DUMP          = 0x13;
Client.COM_CONNECT_OUT         = 0x14;
Client.COM_REGISTER_SLAVE      = 0x15;
Client.COM_STMT_PREPARE        = 0x16;
Client.COM_STMT_EXECUTE        = 0x17;
Client.COM_STMT_SEND_LONG_DATA = 0x18;
Client.COM_STMT_CLOSE          = 0x19;
Client.COM_STMT_RESET          = 0x1a;
Client.COM_SET_OPTION          = 0x1b;
Client.COM_STMT_FETCH          = 0x1c;

// Collations / Charsets
Client.BIG5_CHINESE_CI      = 1;
Client.LATIN2_CZECH_CS      = 2;
Client.DEC8_SWEDISH_CI      = 3;
Client.CP850_GENERAL_CI     = 4;
Client.LATIN1_GERMAN1_CI    = 5;
Client.HP8_ENGLISH_CI       = 6;
Client.KOI8R_GENERAL_CI     = 7;
Client.LATIN1_SWEDISH_CI    = 8;
Client.LATIN2_GENERAL_CI    = 9;
Client.SWE7_SWEDISH_CI      = 10;
Client.ASCII_GENERAL_CI     = 11;
Client.UJIS_JAPANESE_CI     = 12;
Client.SJIS_JAPANESE_CI     = 13;
Client.CP1251_BULGARIAN_CI  = 14;
Client.LATIN1_DANISH_CI     = 15;
Client.HEBREW_GENERAL_CI    = 16;
Client.TIS620_THAI_CI       = 18;
Client.EUCKR_KOREAN_CI      = 19;
Client.LATIN7_ESTONIAN_CS   = 20;
Client.LATIN2_HUNGARIAN_CI  = 21;
Client.KOI8U_GENERAL_CI     = 22;
Client.CP1251_UKRAINIAN_CI  = 23;
Client.GB2312_CHINESE_CI    = 24;
Client.GREEK_GENERAL_CI     = 25;
Client.CP1250_GENERAL_CI    = 26;
Client.LATIN2_CROATIAN_CI   = 27;
Client.GBK_CHINESE_CI       = 28;
Client.CP1257_LITHUANIAN_CI = 29;
Client.LATIN5_TURKISH_CI    = 30;
Client.LATIN1_GERMAN2_CI    = 31;
Client.ARMSCII8_GENERAL_CI  = 32;
Client.UTF8_GENERAL_CI      = 33;
Client.CP1250_CZECH_CS      = 34;
Client.UCS2_GENERAL_CI      = 35;
Client.CP866_GENERAL_CI     = 36;
Client.KEYBCS2_GENERAL_CI   = 37;
Client.MACCE_GENERAL_CI     = 38;
Client.MACROMAN_GENERAL_CI  = 39;
Client.CP852_GENERAL_CI     = 40;
Client.LATIN7_GENERAL_CI    = 41;
Client.LATIN7_GENERAL_CS    = 42;
Client.MACCE_BIN            = 43;
Client.CP1250_CROATIAN_CI   = 44;
Client.LATIN1_BIN           = 47;
Client.LATIN1_GENERAL_CI    = 48;
Client.LATIN1_GENERAL_CS    = 49;
Client.CP1251_BIN           = 50;
Client.CP1251_GENERAL_CI    = 51;
Client.CP1251_GENERAL_CS    = 52;
Client.MACROMAN_BIN         = 53;
Client.CP1256_GENERAL_CI    = 57;
Client.CP1257_BIN           = 58;
Client.CP1257_GENERAL_CI    = 59;
Client.BINARY               = 63;
Client.ARMSCII8_BIN         = 64;
Client.ASCII_BIN            = 65;
Client.CP1250_BIN           = 66;
Client.CP1256_BIN           = 67;
Client.CP866_BIN            = 68;
Client.DEC8_BIN             = 69;
Client.GREEK_BIN            = 70;
Client.HEBREW_BIN           = 71;
Client.HP8_BIN              = 72;
Client.KEYBCS2_BIN          = 73;
Client.KOI8R_BIN            = 74;
Client.KOI8U_BIN            = 75;
Client.LATIN2_BIN           = 77;
Client.LATIN5_BIN           = 78;
Client.LATIN7_BIN           = 79;
Client.CP850_BIN            = 80;
Client.CP852_BIN            = 81;
Client.SWE7_BIN             = 82;
Client.UTF8_BIN             = 83;
Client.BIG5_BIN             = 84;
Client.EUCKR_BIN            = 85;
Client.GB2312_BIN           = 86;
Client.GBK_BIN              = 87;
Client.SJIS_BIN             = 88;
Client.TIS620_BIN           = 89;
Client.UCS2_BIN             = 90;
Client.UJIS_BIN             = 91;
Client.GEOSTD8_GENERAL_CI   = 92;
Client.GEOSTD8_BIN          = 93;
Client.LATIN1_SPANISH_CI    = 94;
Client.CP932_JAPANESE_CI    = 95;
Client.CP932_BIN            = 96;
Client.EUCJPMS_JAPANESE_CI  = 97;
Client.EUCJPMS_BIN          = 98;
Client.CP1250_POLISH_CI     = 99;
Client.UCS2_UNICODE_CI      = 128;
Client.UCS2_ICELANDIC_CI    = 129;
Client.UCS2_LATVIAN_CI      = 130;
Client.UCS2_ROMANIAN_CI     = 131;
Client.UCS2_SLOVENIAN_CI    = 132;
Client.UCS2_POLISH_CI       = 133;
Client.UCS2_ESTONIAN_CI     = 134;
Client.UCS2_SPANISH_CI      = 135;
Client.UCS2_SWEDISH_CI      = 136;
Client.UCS2_TURKISH_CI      = 137;
Client.UCS2_CZECH_CI        = 138;
Client.UCS2_DANISH_CI       = 139;
Client.UCS2_LITHUANIAN_CI   = 140;
Client.UCS2_SLOVAK_CI       = 141;
Client.UCS2_SPANISH2_CI     = 142;
Client.UCS2_ROMAN_CI        = 143;
Client.UCS2_PERSIAN_CI      = 144;
Client.UCS2_ESPERANTO_CI    = 145;
Client.UCS2_HUNGARIAN_CI    = 146;
Client.UTF8_UNICODE_CI      = 192;
Client.UTF8_ICELANDIC_CI    = 193;
Client.UTF8_LATVIAN_CI      = 194;
Client.UTF8_ROMANIAN_CI     = 195;
Client.UTF8_SLOVENIAN_CI    = 196;
Client.UTF8_POLISH_CI       = 197;
Client.UTF8_ESTONIAN_CI     = 198;
Client.UTF8_SPANISH_CI      = 199;
Client.UTF8_SWEDISH_CI      = 200;
Client.UTF8_TURKISH_CI      = 201;
Client.UTF8_CZECH_CI        = 202;
Client.UTF8_DANISH_CI       = 203;
Client.UTF8_LITHUANIAN_CI   = 204;
Client.UTF8_SLOVAK_CI       = 205;
Client.UTF8_SPANISH2_CI     = 206;
Client.UTF8_ROMAN_CI        = 207;
Client.UTF8_PERSIAN_CI      = 208;
Client.UTF8_ESPERANTO_CI    = 209;
Client.UTF8_HUNGARIAN_CI    = 210;

// Error numbers
// from: http://dev.mysql.com/doc/refman/5.0/en/error-messages-server.html
Client.ERROR_HASHCHK                                 = 1000;
Client.ERROR_NISAMCHK                                = 1001;
Client.ERROR_NO                                      = 1002;
Client.ERROR_YES                                     = 1003;
Client.ERROR_CANT_CREATE_FILE                        = 1004;
Client.ERROR_CANT_CREATE_TABLE                       = 1005;
Client.ERROR_CANT_CREATE_DB                          = 1006;
Client.ERROR_DB_CREATE_EXISTS                        = 1007;
Client.ERROR_DB_DROP_EXISTS                          = 1008;
Client.ERROR_DB_DROP_DELETE                          = 1009;
Client.ERROR_DB_DROP_RMDIR                           = 1010;
Client.ERROR_CANT_DELETE_FILE                        = 1011;
Client.ERROR_CANT_FIND_SYSTEM_REC                    = 1012;
Client.ERROR_CANT_GET_STAT                           = 1013;
Client.ERROR_CANT_GET_WD                             = 1014;
Client.ERROR_CANT_LOCK                               = 1015;
Client.ERROR_CANT_OPEN_FILE                          = 1016;
Client.ERROR_FILE_NOT_FOUND                          = 1017;
Client.ERROR_CANT_READ_DIR                           = 1018;
Client.ERROR_CANT_SET_WD                             = 1019;
Client.ERROR_CHECKREAD                               = 1020;
Client.ERROR_DISK_FULL                               = 1021;
Client.ERROR_DUP_KEY                                 = 1022;
Client.ERROR_ERROR_ON_CLOSE                          = 1023;
Client.ERROR_ERROR_ON_READ                           = 1024;
Client.ERROR_ERROR_ON_RENAME                         = 1025;
Client.ERROR_ERROR_ON_WRITE                          = 1026;
Client.ERROR_FILE_USED                               = 1027;
Client.ERROR_FILSORT_ABORT                           = 1028;
Client.ERROR_FORM_NOT_FOUND                          = 1029;
Client.ERROR_GET_ERRNO                               = 1030;
Client.ERROR_ILLEGAL_HA                              = 1031;
Client.ERROR_KEY_NOT_FOUND                           = 1032;
Client.ERROR_NOT_FORM_FILE                           = 1033;
Client.ERROR_NOT_KEYFILE                             = 1034;
Client.ERROR_OLD_KEYFILE                             = 1035;
Client.ERROR_OPEN_AS_READONLY                        = 1036;
Client.ERROR_OUTOFMEMORY                             = 1037;
Client.ERROR_OUT_OF_SORTMEMORY                       = 1038;
Client.ERROR_UNEXPECTED_EOF                          = 1039;
Client.ERROR_CON_COUNT_ERROR                         = 1040;
Client.ERROR_OUT_OF_RESOURCES                        = 1041;
Client.ERROR_BAD_HOST_ERROR                          = 1042;
Client.ERROR_HANDSHAKE_ERROR                         = 1043;
Client.ERROR_DBACCESS_DENIED_ERROR                   = 1044;
Client.ERROR_ACCESS_DENIED_ERROR                     = 1045;
Client.ERROR_NO_DB_ERROR                             = 1046;
Client.ERROR_UNKNOWN_COM_ERROR                       = 1047;
Client.ERROR_BAD_NULL_ERROR                          = 1048;
Client.ERROR_BAD_DB_ERROR                            = 1049;
Client.ERROR_TABLE_EXISTS_ERROR                      = 1050;
Client.ERROR_BAD_TABLE_ERROR                         = 1051;
Client.ERROR_NON_UNIQ_ERROR                          = 1052;
Client.ERROR_SERVERROR_SHUTDOWN                      = 1053;
Client.ERROR_BAD_FIELD_ERROR                         = 1054;
Client.ERROR_WRONG_FIELD_WITH_GROUP                  = 1055;
Client.ERROR_WRONG_GROUP_FIELD                       = 1056;
Client.ERROR_WRONG_SUM_SELECT                        = 1057;
Client.ERROR_WRONG_VALUE_COUNT                       = 1058;
Client.ERROR_TOO_LONG_IDENT                          = 1059;
Client.ERROR_DUP_FIELDNAME                           = 1060;
Client.ERROR_DUP_KEYNAME                             = 1061;
Client.ERROR_DUP_ENTRY                               = 1062;
Client.ERROR_WRONG_FIELD_SPEC                        = 1063;
Client.ERROR_PARSE_ERROR                             = 1064;
Client.ERROR_EMPTY_QUERY                             = 1065;
Client.ERROR_NONUNIQ_TABLE                           = 1066;
Client.ERROR_INVALID_DEFAULT                         = 1067;
Client.ERROR_MULTIPLE_PRI_KEY                        = 1068;
Client.ERROR_TOO_MANY_KEYS                           = 1069;
Client.ERROR_TOO_MANY_KEY_PARTS                      = 1070;
Client.ERROR_TOO_LONG_KEY                            = 1071;
Client.ERROR_KEY_COLUMN_DOES_NOT_EXITS               = 1072;
Client.ERROR_BLOB_USED_AS_KEY                        = 1073;
Client.ERROR_TOO_BIG_FIELDLENGTH                     = 1074;
Client.ERROR_WRONG_AUTO_KEY                          = 1075;
Client.ERROR_READY                                   = 1076;
Client.ERROR_NORMAL_SHUTDOWN                         = 1077;
Client.ERROR_GOT_SIGNAL                              = 1078;
Client.ERROR_SHUTDOWN_COMPLETE                       = 1079;
Client.ERROR_FORCING_CLOSE                           = 1080;
Client.ERROR_IPSOCK_ERROR                            = 1081;
Client.ERROR_NO_SUCH_INDEX                           = 1082;
Client.ERROR_WRONG_FIELD_TERMINATORS                 = 1083;
Client.ERROR_BLOBS_AND_NO_TERMINATED                 = 1084;
Client.ERROR_TEXTFILE_NOT_READABLE                   = 1085;
Client.ERROR_FILE_EXISTS_ERROR                       = 1086;
Client.ERROR_LOAD_INFO                               = 1087;
Client.ERROR_ALTERROR_INFO                           = 1088;
Client.ERROR_WRONG_SUB_KEY                           = 1089;
Client.ERROR_CANT_REMOVE_ALL_FIELDS                  = 1090;
Client.ERROR_CANT_DROP_FIELD_OR_KEY                  = 1091;
Client.ERROR_INSERT_INFO                             = 1092;
Client.ERROR_UPDATE_TABLE_USED                       = 1093;
Client.ERROR_NO_SUCH_THREAD                          = 1094;
Client.ERROR_KILL_DENIED_ERROR                       = 1095;
Client.ERROR_NO_TABLES_USED                          = 1096;
Client.ERROR_TOO_BIG_SET                             = 1097;
Client.ERROR_NO_UNIQUE_LOGFILE                       = 1098;
Client.ERROR_TABLE_NOT_LOCKED_FOR_WRITE              = 1099;
Client.ERROR_TABLE_NOT_LOCKED                        = 1100;
Client.ERROR_BLOB_CANT_HAVE_DEFAULT                  = 1101;
Client.ERROR_WRONG_DB_NAME                           = 1102;
Client.ERROR_WRONG_TABLE_NAME                        = 1103;
Client.ERROR_TOO_BIG_SELECT                          = 1104;
Client.ERROR_UNKNOWN_ERROR                           = 1105;
Client.ERROR_UNKNOWN_PROCEDURE                       = 1106;
Client.ERROR_WRONG_PARAMCOUNT_TO_PROCEDURE           = 1107;
Client.ERROR_WRONG_PARAMETERS_TO_PROCEDURE           = 1108;
Client.ERROR_UNKNOWN_TABLE                           = 1109;
Client.ERROR_FIELD_SPECIFIED_TWICE                   = 1110;
Client.ERROR_INVALID_GROUP_FUNC_USE                  = 1111;
Client.ERROR_UNSUPPORTED_EXTENSION                   = 1112;
Client.ERROR_TABLE_MUST_HAVE_COLUMNS                 = 1113;
Client.ERROR_RECORD_FILE_FULL                        = 1114;
Client.ERROR_UNKNOWN_CHARACTERROR_SET                = 1115;
Client.ERROR_TOO_MANY_TABLES                         = 1116;
Client.ERROR_TOO_MANY_FIELDS                         = 1117;
Client.ERROR_TOO_BIG_ROWSIZE                         = 1118;
Client.ERROR_STACK_OVERRUN                           = 1119;
Client.ERROR_WRONG_OUTERROR_JOIN                     = 1120;
Client.ERROR_NULL_COLUMN_IN_INDEX                    = 1121;
Client.ERROR_CANT_FIND_UDF                           = 1122;
Client.ERROR_CANT_INITIALIZE_UDF                     = 1123;
Client.ERROR_UDF_NO_PATHS                            = 1124;
Client.ERROR_UDF_EXISTS                              = 1125;
Client.ERROR_CANT_OPEN_LIBRARY                       = 1126;
Client.ERROR_CANT_FIND_DL_ENTRY                      = 1127;
Client.ERROR_FUNCTION_NOT_DEFINED                    = 1128;
Client.ERROR_HOST_IS_BLOCKED                         = 1129;
Client.ERROR_HOST_NOT_PRIVILEGED                     = 1130;
Client.ERROR_PASSWORD_ANONYMOUS_USER                 = 1131;
Client.ERROR_PASSWORD_NOT_ALLOWED                    = 1132;
Client.ERROR_PASSWORD_NO_MATCH                       = 1133;
Client.ERROR_UPDATE_INFO                             = 1134;
Client.ERROR_CANT_CREATE_THREAD                      = 1135;
Client.ERROR_WRONG_VALUE_COUNT_ON_ROW                = 1136;
Client.ERROR_CANT_REOPEN_TABLE                       = 1137;
Client.ERROR_INVALID_USE_OF_NULL                     = 1138;
Client.ERROR_REGEXP_ERROR                            = 1139;
Client.ERROR_MIX_OF_GROUP_FUNC_AND_FIELDS            = 1140;
Client.ERROR_NONEXISTING_GRANT                       = 1141;
Client.ERROR_TABLEACCESS_DENIED_ERROR                = 1142;
Client.ERROR_COLUMNACCESS_DENIED_ERROR               = 1143;
Client.ERROR_ILLEGAL_GRANT_FOR_TABLE                 = 1144;
Client.ERROR_GRANT_WRONG_HOST_OR_USER                = 1145;
Client.ERROR_NO_SUCH_TABLE                           = 1146;
Client.ERROR_NONEXISTING_TABLE_GRANT                 = 1147;
Client.ERROR_NOT_ALLOWED_COMMAND                     = 1148;
Client.ERROR_SYNTAX_ERROR                            = 1149;
Client.ERROR_DELAYED_CANT_CHANGE_LOCK                = 1150;
Client.ERROR_TOO_MANY_DELAYED_THREADS                = 1151;
Client.ERROR_ABORTING_CONNECTION                     = 1152;
Client.ERROR_NET_PACKET_TOO_LARGE                    = 1153;
Client.ERROR_NET_READ_ERROR_FROM_PIPE                = 1154;
Client.ERROR_NET_FCNTL_ERROR                         = 1155;
Client.ERROR_NET_PACKETS_OUT_OF_ORDER                = 1156;
Client.ERROR_NET_UNCOMPRESS_ERROR                    = 1157;
Client.ERROR_NET_READ_ERROR                          = 1158;
Client.ERROR_NET_READ_INTERRUPTED                    = 1159;
Client.ERROR_NET_ERROR_ON_WRITE                      = 1160;
Client.ERROR_NET_WRITE_INTERRUPTED                   = 1161;
Client.ERROR_TOO_LONG_STRING                         = 1162;
Client.ERROR_TABLE_CANT_HANDLE_BLOB                  = 1163;
Client.ERROR_TABLE_CANT_HANDLE_AUTO_INCREMENT        = 1164;
Client.ERROR_DELAYED_INSERT_TABLE_LOCKED             = 1165;
Client.ERROR_WRONG_COLUMN_NAME                       = 1166;
Client.ERROR_WRONG_KEY_COLUMN                        = 1167;
Client.ERROR_WRONG_MRG_TABLE                         = 1168;
Client.ERROR_DUP_UNIQUE                              = 1169;
Client.ERROR_BLOB_KEY_WITHOUT_LENGTH                 = 1170;
Client.ERROR_PRIMARY_CANT_HAVE_NULL                  = 1171;
Client.ERROR_TOO_MANY_ROWS                           = 1172;
Client.ERROR_REQUIRES_PRIMARY_KEY                    = 1173;
Client.ERROR_NO_RAID_COMPILED                        = 1174;
Client.ERROR_UPDATE_WITHOUT_KEY_IN_SAFE_MODE         = 1175;
Client.ERROR_KEY_DOES_NOT_EXITS                      = 1176;
Client.ERROR_CHECK_NO_SUCH_TABLE                     = 1177;
Client.ERROR_CHECK_NOT_IMPLEMENTED                   = 1178;
Client.ERROR_CANT_DO_THIS_DURING_AN_TRANSACTION      = 1179;
Client.ERROR_ERROR_DURING_COMMIT                     = 1180;
Client.ERROR_ERROR_DURING_ROLLBACK                   = 1181;
Client.ERROR_ERROR_DURING_FLUSH_LOGS                 = 1182;
Client.ERROR_ERROR_DURING_CHECKPOINT                 = 1183;
Client.ERROR_NEW_ABORTING_CONNECTION                 = 1184;
Client.ERROR_DUMP_NOT_IMPLEMENTED                    = 1185;
Client.ERROR_FLUSH_MASTERROR_BINLOG_CLOSED           = 1186;
Client.ERROR_INDEX_REBUILD                           = 1187;
Client.ERROR_MASTER                                  = 1188;
Client.ERROR_MASTERROR_NET_READ                      = 1189;
Client.ERROR_MASTERROR_NET_WRITE                     = 1190;
Client.ERROR_FT_MATCHING_KEY_NOT_FOUND               = 1191;
Client.ERROR_LOCK_OR_ACTIVE_TRANSACTION              = 1192;
Client.ERROR_UNKNOWN_SYSTEM_VARIABLE                 = 1193;
Client.ERROR_CRASHED_ON_USAGE                        = 1194;
Client.ERROR_CRASHED_ON_REPAIR                       = 1195;
Client.ERROR_WARNING_NOT_COMPLETE_ROLLBACK           = 1196;
Client.ERROR_TRANS_CACHE_FULL                        = 1197;
Client.ERROR_SLAVE_MUST_STOP                         = 1198;
Client.ERROR_SLAVE_NOT_RUNNING                       = 1199;
Client.ERROR_BAD_SLAVE                               = 1200;
Client.ERROR_MASTERROR_INFO                          = 1201;
Client.ERROR_SLAVE_THREAD                            = 1202;
Client.ERROR_TOO_MANY_USERROR_CONNECTIONS            = 1203;
Client.ERROR_SET_CONSTANTS_ONLY                      = 1204;
Client.ERROR_LOCK_WAIT_TIMEOUT                       = 1205;
Client.ERROR_LOCK_TABLE_FULL                         = 1206;
Client.ERROR_READ_ONLY_TRANSACTION                   = 1207;
Client.ERROR_DROP_DB_WITH_READ_LOCK                  = 1208;
Client.ERROR_CREATE_DB_WITH_READ_LOCK                = 1209;
Client.ERROR_WRONG_ARGUMENTS                         = 1210;
Client.ERROR_NO_PERMISSION_TO_CREATE_USER            = 1211;
Client.ERROR_UNION_TABLES_IN_DIFFERENT_DIR           = 1212;
Client.ERROR_LOCK_DEADLOCK                           = 1213;
Client.ERROR_TABLE_CANT_HANDLE_FT                    = 1214;
Client.ERROR_CANNOT_ADD_FOREIGN                      = 1215;
Client.ERROR_NO_REFERENCED_ROW                       = 1216;
Client.ERROR_ROW_IS_REFERENCED                       = 1217;
Client.ERROR_CONNECT_TO_MASTER                       = 1218;
Client.ERROR_QUERY_ON_MASTER                         = 1219;
Client.ERROR_ERROR_WHEN_EXECUTING_COMMAND            = 1220;
Client.ERROR_WRONG_USAGE                             = 1221;
Client.ERROR_WRONG_NUMBERROR_OF_COLUMNS_IN_SELECT    = 1222;
Client.ERROR_CANT_UPDATE_WITH_READLOCK               = 1223;
Client.ERROR_MIXING_NOT_ALLOWED                      = 1224;
Client.ERROR_DUP_ARGUMENT                            = 1225;
Client.ERROR_USERROR_LIMIT_REACHED                   = 1226;
Client.ERROR_SPECIFIC_ACCESS_DENIED_ERROR            = 1227;
Client.ERROR_LOCAL_VARIABLE                          = 1228;
Client.ERROR_GLOBAL_VARIABLE                         = 1229;
Client.ERROR_NO_DEFAULT                              = 1230;
Client.ERROR_WRONG_VALUE_FOR_VAR                     = 1231;
Client.ERROR_WRONG_TYPE_FOR_VAR                      = 1232;
Client.ERROR_VAR_CANT_BE_READ                        = 1233;
Client.ERROR_CANT_USE_OPTION_HERE                    = 1234;
Client.ERROR_NOT_SUPPORTED_YET                       = 1235;
Client.ERROR_MASTERROR_FATAL_ERROR_READING_BINLOG    = 1236;
Client.ERROR_SLAVE_IGNORED_TABLE                     = 1237;
Client.ERROR_INCORRECT_GLOBAL_LOCAL_VAR              = 1238;
Client.ERROR_WRONG_FK_DEF                            = 1239;
Client.ERROR_KEY_REF_DO_NOT_MATCH_TABLE_REF          = 1240;
Client.ERROR_OPERAND_COLUMNS                         = 1241;
Client.ERROR_SUBQUERY_NO_1_ROW                       = 1242;
Client.ERROR_UNKNOWN_STMT_HANDLER                    = 1243;
Client.ERROR_CORRUPT_HELP_DB                         = 1244;
Client.ERROR_CYCLIC_REFERENCE                        = 1245;
Client.ERROR_AUTO_CONVERT                            = 1246;
Client.ERROR_ILLEGAL_REFERENCE                       = 1247;
Client.ERROR_DERIVED_MUST_HAVE_ALIAS                 = 1248;
Client.ERROR_SELECT_REDUCED                          = 1249;
Client.ERROR_TABLENAME_NOT_ALLOWED_HERE              = 1250;
Client.ERROR_NOT_SUPPORTED_AUTH_MODE                 = 1251;
Client.ERROR_SPATIAL_CANT_HAVE_NULL                  = 1252;
Client.ERROR_COLLATION_CHARSET_MISMATCH              = 1253;
Client.ERROR_SLAVE_WAS_RUNNING                       = 1254;
Client.ERROR_SLAVE_WAS_NOT_RUNNING                   = 1255;
Client.ERROR_TOO_BIG_FOR_UNCOMPRESS                  = 1256;
Client.ERROR_ZLIB_Z_MEM_ERROR                        = 1257;
Client.ERROR_ZLIB_Z_BUF_ERROR                        = 1258;
Client.ERROR_ZLIB_Z_DATA_ERROR                       = 1259;
Client.ERROR_CUT_VALUE_GROUP_CONCAT                  = 1260;
Client.ERROR_WARN_TOO_FEW_RECORDS                    = 1261;
Client.ERROR_WARN_TOO_MANY_RECORDS                   = 1262;
Client.ERROR_WARN_NULL_TO_NOTNULL                    = 1263;
Client.ERROR_WARN_DATA_OUT_OF_RANGE                  = 1264;
Client.WARN_DATA_TRUNCATED                           = 1265;
Client.ERROR_WARN_USING_OTHERROR_HANDLER             = 1266;
Client.ERROR_CANT_AGGREGATE_2COLLATIONS              = 1267;
Client.ERROR_DROP_USER                               = 1268;
Client.ERROR_REVOKE_GRANTS                           = 1269;
Client.ERROR_CANT_AGGREGATE_3COLLATIONS              = 1270;
Client.ERROR_CANT_AGGREGATE_NCOLLATIONS              = 1271;
Client.ERROR_VARIABLE_IS_NOT_STRUCT                  = 1272;
Client.ERROR_UNKNOWN_COLLATION                       = 1273;
Client.ERROR_SLAVE_IGNORED_SSL_PARAMS                = 1274;
Client.ERROR_SERVERROR_IS_IN_SECURE_AUTH_MODE        = 1275;
Client.ERROR_WARN_FIELD_RESOLVED                     = 1276;
Client.ERROR_BAD_SLAVE_UNTIL_COND                    = 1277;
Client.ERROR_MISSING_SKIP_SLAVE                      = 1278;
Client.ERROR_UNTIL_COND_IGNORED                      = 1279;
Client.ERROR_WRONG_NAME_FOR_INDEX                    = 1280;
Client.ERROR_WRONG_NAME_FOR_CATALOG                  = 1281;
Client.ERROR_WARN_QC_RESIZE                          = 1282;
Client.ERROR_BAD_FT_COLUMN                           = 1283;
Client.ERROR_UNKNOWN_KEY_CACHE                       = 1284;
Client.ERROR_WARN_HOSTNAME_WONT_WORK                 = 1285;
Client.ERROR_UNKNOWN_STORAGE_ENGINE                  = 1286;
Client.ERROR_WARN_DEPRECATED_SYNTAX                  = 1287;
Client.ERROR_NON_UPDATABLE_TABLE                     = 1288;
Client.ERROR_FEATURE_DISABLED                        = 1289;
Client.ERROR_OPTION_PREVENTS_STATEMENT               = 1290;
Client.ERROR_DUPLICATED_VALUE_IN_TYPE                = 1291;
Client.ERROR_TRUNCATED_WRONG_VALUE                   = 1292;
Client.ERROR_TOO_MUCH_AUTO_TIMESTAMP_COLS            = 1293;
Client.ERROR_INVALID_ON_UPDATE                       = 1294;
Client.ERROR_UNSUPPORTED_PS                          = 1295;
Client.ERROR_GET_ERRMSG                              = 1296;
Client.ERROR_GET_TEMPORARY_ERRMSG                    = 1297;
Client.ERROR_UNKNOWN_TIME_ZONE                       = 1298;
Client.ERROR_WARN_INVALID_TIMESTAMP                  = 1299;
Client.ERROR_INVALID_CHARACTERROR_STRING             = 1300;
Client.ERROR_WARN_ALLOWED_PACKET_OVERFLOWED          = 1301;
Client.ERROR_CONFLICTING_DECLARATIONS                = 1302;
Client.ERROR_SP_NO_RECURSIVE_CREATE                  = 1303;
Client.ERROR_SP_ALREADY_EXISTS                       = 1304;
Client.ERROR_SP_DOES_NOT_EXIST                       = 1305;
Client.ERROR_SP_DROP_FAILED                          = 1306;
Client.ERROR_SP_STORE_FAILED                         = 1307;
Client.ERROR_SP_LILABEL_MISMATCH                     = 1308;
Client.ERROR_SP_LABEL_REDEFINE                       = 1309;
Client.ERROR_SP_LABEL_MISMATCH                       = 1310;
Client.ERROR_SP_UNINIT_VAR                           = 1311;
Client.ERROR_SP_BADSELECT                            = 1312;
Client.ERROR_SP_BADRETURN                            = 1313;
Client.ERROR_SP_BADSTATEMENT                         = 1314;
Client.ERROR_UPDATE_LOG_DEPRECATED_IGNORED           = 1315;
Client.ERROR_UPDATE_LOG_DEPRECATED_TRANSLATED        = 1316;
Client.ERROR_QUERY_INTERRUPTED                       = 1317;
Client.ERROR_SP_WRONG_NO_OF_ARGS                     = 1318;
Client.ERROR_SP_COND_MISMATCH                        = 1319;
Client.ERROR_SP_NORETURN                             = 1320;
Client.ERROR_SP_NORETURNEND                          = 1321;
Client.ERROR_SP_BAD_CURSOR_QUERY                     = 1322;
Client.ERROR_SP_BAD_CURSOR_SELECT                    = 1323;
Client.ERROR_SP_CURSOR_MISMATCH                      = 1324;
Client.ERROR_SP_CURSOR_ALREADY_OPEN                  = 1325;
Client.ERROR_SP_CURSOR_NOT_OPEN                      = 1326;
Client.ERROR_SP_UNDECLARED_VAR                       = 1327;
Client.ERROR_SP_WRONG_NO_OF_FETCH_ARGS               = 1328;
Client.ERROR_SP_FETCH_NO_DATA                        = 1329;
Client.ERROR_SP_DUP_PARAM                            = 1330;
Client.ERROR_SP_DUP_VAR                              = 1331;
Client.ERROR_SP_DUP_COND                             = 1332;
Client.ERROR_SP_DUP_CURS                             = 1333;
Client.ERROR_SP_CANT_ALTER                           = 1334;
Client.ERROR_SP_SUBSELECT_NYI                        = 1335;
Client.ERROR_STMT_NOT_ALLOWED_IN_SF_OR_TRG           = 1336;
Client.ERROR_SP_VARCOND_AFTERROR_CURSHNDLR           = 1337;
Client.ERROR_SP_CURSOR_AFTERROR_HANDLER              = 1338;
Client.ERROR_SP_CASE_NOT_FOUND                       = 1339;
Client.ERROR_FPARSERROR_TOO_BIG_FILE                 = 1340;
Client.ERROR_FPARSERROR_BAD_HEADER                   = 1341;
Client.ERROR_FPARSERROR_EOF_IN_COMMENT               = 1342;
Client.ERROR_FPARSERROR_ERROR_IN_PARAMETER           = 1343;
Client.ERROR_FPARSERROR_EOF_IN_UNKNOWN_PARAMETER     = 1344;
Client.ERROR_VIEW_NO_EXPLAIN                         = 1345;
Client.ERROR_FRM_UNKNOWN_TYPE                        = 1346;
Client.ERROR_WRONG_OBJECT                            = 1347;
Client.ERROR_NONUPDATEABLE_COLUMN                    = 1348;
Client.ERROR_VIEW_SELECT_DERIVED                     = 1349;
Client.ERROR_VIEW_SELECT_CLAUSE                      = 1350;
Client.ERROR_VIEW_SELECT_VARIABLE                    = 1351;
Client.ERROR_VIEW_SELECT_TMPTABLE                    = 1352;
Client.ERROR_VIEW_WRONG_LIST                         = 1353;
Client.ERROR_WARN_VIEW_MERGE                         = 1354;
Client.ERROR_WARN_VIEW_WITHOUT_KEY                   = 1355;
Client.ERROR_VIEW_INVALID                            = 1356;
Client.ERROR_SP_NO_DROP_SP                           = 1357;
Client.ERROR_SP_GOTO_IN_HNDLR                        = 1358;
Client.ERROR_TRG_ALREADY_EXISTS                      = 1359;
Client.ERROR_TRG_DOES_NOT_EXIST                      = 1360;
Client.ERROR_TRG_ON_VIEW_OR_TEMP_TABLE               = 1361;
Client.ERROR_TRG_CANT_CHANGE_ROW                     = 1362;
Client.ERROR_TRG_NO_SUCH_ROW_IN_TRG                  = 1363;
Client.ERROR_NO_DEFAULT_FOR_FIELD                    = 1364;
Client.ERROR_DIVISION_BY_ZERO                        = 1365;
Client.ERROR_TRUNCATED_WRONG_VALUE_FOR_FIELD         = 1366;
Client.ERROR_ILLEGAL_VALUE_FOR_TYPE                  = 1367;
Client.ERROR_VIEW_NONUPD_CHECK                       = 1368;
Client.ERROR_VIEW_CHECK_FAILED                       = 1369;
Client.ERROR_PROCACCESS_DENIED_ERROR                 = 1370;
Client.ERROR_RELAY_LOG_FAIL                          = 1371;
Client.ERROR_PASSWD_LENGTH                           = 1372;
Client.ERROR_UNKNOWN_TARGET_BINLOG                   = 1373;
Client.ERROR_IO_ERR_LOG_INDEX_READ                   = 1374;
Client.ERROR_BINLOG_PURGE_PROHIBITED                 = 1375;
Client.ERROR_FSEEK_FAIL                              = 1376;
Client.ERROR_BINLOG_PURGE_FATAL_ERR                  = 1377;
Client.ERROR_LOG_IN_USE                              = 1378;
Client.ERROR_LOG_PURGE_UNKNOWN_ERR                   = 1379;
Client.ERROR_RELAY_LOG_INIT                          = 1380;
Client.ERROR_NO_BINARY_LOGGING                       = 1381;
Client.ERROR_RESERVED_SYNTAX                         = 1382;
Client.ERROR_WSAS_FAILED                             = 1383;
Client.ERROR_DIFF_GROUPS_PROC                        = 1384;
Client.ERROR_NO_GROUP_FOR_PROC                       = 1385;
Client.ERROR_ORDERROR_WITH_PROC                      = 1386;
Client.ERROR_LOGGING_PROHIBIT_CHANGING_OF            = 1387;
Client.ERROR_NO_FILE_MAPPING                         = 1388;
Client.ERROR_WRONG_MAGIC                             = 1389;
Client.ERROR_PS_MANY_PARAM                           = 1390;
Client.ERROR_KEY_PART_0                              = 1391;
Client.ERROR_VIEW_CHECKSUM                           = 1392;
Client.ERROR_VIEW_MULTIUPDATE                        = 1393;
Client.ERROR_VIEW_NO_INSERT_FIELD_LIST               = 1394;
Client.ERROR_VIEW_DELETE_MERGE_VIEW                  = 1395;
Client.ERROR_CANNOT_USER                             = 1396;
Client.ERROR_XAERROR_NOTA                            = 1397;
Client.ERROR_XAERROR_INVAL                           = 1398;
Client.ERROR_XAERROR_RMFAIL                          = 1399;
Client.ERROR_XAERROR_OUTSIDE                         = 1400;
Client.ERROR_XAERROR_RMERR                           = 1401;
Client.ERROR_XA_RBROLLBACK                           = 1402;
Client.ERROR_NONEXISTING_PROC_GRANT                  = 1403;
Client.ERROR_PROC_AUTO_GRANT_FAIL                    = 1404;
Client.ERROR_PROC_AUTO_REVOKE_FAIL                   = 1405;
Client.ERROR_DATA_TOO_LONG                           = 1406;
Client.ERROR_SP_BAD_SQLSTATE                         = 1407;
Client.ERROR_STARTUP                                 = 1408;
Client.ERROR_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR        = 1409;
Client.ERROR_CANT_CREATE_USERROR_WITH_GRANT          = 1410;
Client.ERROR_WRONG_VALUE_FOR_TYPE                    = 1411;
Client.ERROR_TABLE_DEF_CHANGED                       = 1412;
Client.ERROR_SP_DUP_HANDLER                          = 1413;
Client.ERROR_SP_NOT_VAR_ARG                          = 1414;
Client.ERROR_SP_NO_RETSET                            = 1415;
Client.ERROR_CANT_CREATE_GEOMETRY_OBJECT             = 1416;
Client.ERROR_FAILED_ROUTINE_BREAK_BINLOG             = 1417;
Client.ERROR_BINLOG_UNSAFE_ROUTINE                   = 1418;
Client.ERROR_BINLOG_CREATE_ROUTINE_NEED_SUPER        = 1419;
Client.ERROR_EXEC_STMT_WITH_OPEN_CURSOR              = 1420;
Client.ERROR_STMT_HAS_NO_OPEN_CURSOR                 = 1421;
Client.ERROR_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG         = 1422;
Client.ERROR_NO_DEFAULT_FOR_VIEW_FIELD               = 1423;
Client.ERROR_SP_NO_RECURSION                         = 1424;
Client.ERROR_TOO_BIG_SCALE                           = 1425;
Client.ERROR_TOO_BIG_PRECISION                       = 1426;
Client.ERROR_M_BIGGERROR_THAN_D                      = 1427;
Client.ERROR_WRONG_LOCK_OF_SYSTEM_TABLE              = 1428;
Client.ERROR_CONNECT_TO_FOREIGN_DATA_SOURCE          = 1429;
Client.ERROR_QUERY_ON_FOREIGN_DATA_SOURCE            = 1430;
Client.ERROR_FOREIGN_DATA_SOURCE_DOESNT_EXIST        = 1431;
Client.ERROR_FOREIGN_DATA_STRING_INVALID_CANT_CREATE = 1432;
Client.ERROR_FOREIGN_DATA_STRING_INVALID             = 1433;
Client.ERROR_CANT_CREATE_FEDERATED_TABLE             = 1434;
Client.ERROR_TRG_IN_WRONG_SCHEMA                     = 1435;
Client.ERROR_STACK_OVERRUN_NEED_MORE                 = 1436;
Client.ERROR_TOO_LONG_BODY                           = 1437;
Client.ERROR_WARN_CANT_DROP_DEFAULT_KEYCACHE         = 1438;
Client.ERROR_TOO_BIG_DISPLAYWIDTH                    = 1439;
Client.ERROR_XAERROR_DUPID                           = 1440;
Client.ERROR_DATETIME_FUNCTION_OVERFLOW              = 1441;
Client.ERROR_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG     = 1442;
Client.ERROR_VIEW_PREVENT_UPDATE                     = 1443;
Client.ERROR_PS_NO_RECURSION                         = 1444;
Client.ERROR_SP_CANT_SET_AUTOCOMMIT                  = 1445;
Client.ERROR_MALFORMED_DEFINER                       = 1446;
Client.ERROR_VIEW_FRM_NO_USER                        = 1447;
Client.ERROR_VIEW_OTHERROR_USER                      = 1448;
Client.ERROR_NO_SUCH_USER                            = 1449;
Client.ERROR_FORBID_SCHEMA_CHANGE                    = 1450;
Client.ERROR_ROW_IS_REFERENCED_2                     = 1451;
Client.ERROR_NO_REFERENCED_ROW_2                     = 1452;
Client.ERROR_SP_BAD_VAR_SHADOW                       = 1453;
Client.ERROR_TRG_NO_DEFINER                          = 1454;
Client.ERROR_OLD_FILE_FORMAT                         = 1455;
Client.ERROR_SP_RECURSION_LIMIT                      = 1456;
Client.ERROR_SP_PROC_TABLE_CORRUPT                   = 1457;
Client.ERROR_SP_WRONG_NAME                           = 1458;
Client.ERROR_TABLE_NEEDS_UPGRADE                     = 1459;
Client.ERROR_SP_NO_AGGREGATE                         = 1460;
Client.ERROR_MAX_PREPARED_STMT_COUNT_REACHED         = 1461;
Client.ERROR_VIEW_RECURSIVE                          = 1462;
Client.ERROR_NON_GROUPING_FIELD_USED                 = 1463;
Client.ERROR_TABLE_CANT_HANDLE_SPKEYS                = 1464;
Client.ERROR_NO_TRIGGERS_ON_SYSTEM_SCHEMA            = 1465;
Client.ERROR_REMOVED_SPACES                          = 1466;
Client.ERROR_AUTOINC_READ_FAILED                     = 1467;
Client.ERROR_USERNAME                                = 1468;
Client.ERROR_HOSTNAME                                = 1469;
Client.ERROR_WRONG_STRING_LENGTH                     = 1470;
Client.ERROR_NON_INSERTABLE_TABLE                    = 1471;
Client.ERROR_ADMIN_WRONG_MRG_TABLE                   = 1472;
Client.ERROR_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT    = 1473;
Client.ERROR_NAME_BECOMES_EMPTY                      = 1474;
Client.ERROR_AMBIGUOUS_FIELD_TERM                    = 1475;
Client.ERROR_LOAD_DATA_INVALID_COLUMN                = 1476;
Client.ERROR_LOG_PURGE_NO_FILE                       = 1477;
Client.ERROR_XA_RBTIMEOUT                            = 1478;
Client.ERROR_XA_RBDEADLOCK                           = 1479;
Client.ERROR_TOO_MANY_CONCURRENT_TRXS                = 1480;
