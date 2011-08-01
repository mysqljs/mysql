if (global.GENTLY) require = GENTLY.hijack(require);

var util = require('util');
var Stream = require('net').Stream;
var auth = require('./auth');
var constants = require('./constants');
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
  this.charsetNumber = constants.UTF8_UNICODE_CI;
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


Client.defaultFlags =
    constants.CLIENT_LONG_PASSWORD
  | constants.CLIENT_FOUND_ROWS
  | constants.CLIENT_LONG_FLAG
  | constants.CLIENT_CONNECT_WITH_DB
  | constants.CLIENT_ODBC
  | constants.CLIENT_LOCAL_FILES
  | constants.CLIENT_IGNORE_SPACE
  | constants.CLIENT_PROTOCOL_41
  | constants.CLIENT_INTERACTIVE
  | constants.CLIENT_IGNORE_SIGPIPE
  | constants.CLIENT_TRANSACTIONS
  | constants.CLIENT_RESERVED
  | constants.CLIENT_SECURE_CONNECTION
  | constants.CLIENT_MULTI_STATEMENTS
  | constants.CLIENT_MULTI_RESULTS;

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
