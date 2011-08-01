if (global.GENTLY) require = GENTLY.hijack(require);

var util = require('util');
var Stream = require('net').Stream;
var auth = require('./auth');
var Parser = require('./parser');
var OutgoingPacket = require('./outgoing_packet');
var Query = require('./query');
var EventEmitter = require('events').EventEmitter;

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
    var connection = self._connection = new Stream();
    var parser = self._parser = new Parser();

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
    if (typeof val.toISOString === 'function') {
      val = val.toISOString();
    } else {
      val = val.toString();
    }
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
  this._enqueue(function statistics() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, Client.COM_STATISTICS);
    self.write(packet);
  }, cb);
};

Client.prototype.useDatabase = function(database, cb) {
  var self = this;
  this._enqueue(function useDatabase() {
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
  var token = auth.token(this.password, greeting.scrambleBuffer);
  var packetSize = (
    4 + 4 + 1 + 23 +
    this.user.length + 1 +
    token.length + 1 +
    this.database.length + 1
  );
  var packet = new OutgoingPacket(packetSize, greeting.number+1);

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
  var token = auth.scramble323(greeting.scrambleBuffer, this.password);
  var packetSize = (
    token.length + 1
  );
  var packet = new OutgoingPacket(packetSize, greeting.number+3);

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
