var util = require('util');
var Socket = require('net').Socket;
var auth = require('./auth');
var constants = require('./constants');
var Parser = require('./parser');
var OutgoingPacket = require('./outgoing_packet');
var Query = require('./query');
var EventEmitter = require('events').EventEmitter;

function Client() {
  if (!(this instanceof Client) || arguments.length) {
    throw new Error('deprecated: use mysql.createClient() instead');
  }

  EventEmitter.call(this);

  this.host = 'localhost';
  this.port = 3306;
  this.user = 'root';
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
  this._socket = null;
  this._parser = null;
};
util.inherits(Client, EventEmitter);
module.exports = Client;

Client.prototype.connect = function() {
  throw new Error('deprecated: connect() is now done automatically.');
};

Client.prototype._connect = function() {
  this.destroy();

  var socket = this._socket = new Socket();
  var parser = this._parser = new Parser();
  var self = this;

  socket
    .on('error', this._connectionErrorHandler())
    .on('data', parser.write.bind(parser))
    .on('end', function() {
      if (self.ending) {
        // @todo destroy()?
        self.connected = false;
        self.ending = false;

        if (self._queue.length) {
          self._connect();
        }

        return;
      }

      if (!self.connected) {
        this.emit('error', new Error('reconnection attempt failed before connection was fully set up'));
        return;
      }

      self._connect();
    })
    .connect(this.port, this.host);

  parser.on('packet', this._handlePacket.bind(this));
};

Client.prototype.query = function(sql, params, cb) {
  if (Array.isArray(params)) {
    sql = this.format(sql, params);
  } else {
    cb = arguments[1];
  }

  var query = new Query({
    typeCast: this.typeCast,
    sql: sql
  });

  var self = this;
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

    packet.writeNumber(1, constants.COM_QUERY);
    packet.write(sql, 'utf-8');
    self.write(packet);
  }, query);

  return query;
};

Client.prototype.write = function(packet) {
  if (this.debug) {
    console.log('-> %s', packet.buffer.inspect());
  }

  this._socket.write(packet.buffer);
};

Client.prototype.format = function(sql, params) {
  var escape = this.escape;
  params = params.concat();

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
    val = (typeof val.toISOString === 'function')
      ? val.toISOString()
      : val.toString();
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
    packet.writeNumber(1, constants.COM_PING);
    self.write(packet);
  }, cb);
};

Client.prototype.statistics = function(cb) {
  var self = this;
  this._enqueue(function statistics() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, constants.COM_STATISTICS);
    self.write(packet);
  }, cb);
};

Client.prototype.useDatabase = function(database, cb) {
  var self = this;
  this._enqueue(function useDatabase() {
    var packet = new OutgoingPacket(1 + Buffer.byteLength(database, 'utf-8'));
    packet.writeNumber(1, constants.COM_INIT_DB);
    packet.write(database, 'utf-8');
    self.write(packet);
  }, cb);
};

Client.prototype.destroy = function() {
  if (this._socket) {
    this._socket.destroy();
  }

  this._socket = null;
  this._parser = null;
  this.connected = false;
}

Client.prototype.end = function(cb) {
  var self = this;

  this.ending = true;

  this._enqueue(function end() {
    var packet = new OutgoingPacket(1);
    packet.writeNumber(1, constants.COM_QUIT);
    self.write(packet);

    // @todo handle clean shut down properly
    if (cb) {
      self._socket.on('end', cb);
    }

    self._dequeue();
  }, cb);
};

Client.prototype._enqueue = function(fn, delegate) {
  if (!this._socket) {
    this._connect();
  }

  this._queue.push({fn: fn, delegate: delegate});
  if (this._queue.length === 1 && this.connected) {
    fn();
  }
};

Client.prototype._dequeue = function() {
  this._queue.shift();

  if (!this._queue.length) {
    return;
  }

  if (!this.connected) {
    this._connect();
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

  if (!this.connected) {
    if (packet.type != Parser.ERROR_PACKET) {
      this.connected = true;

      if (this._queue.length) this._queue[0].fn();
      return;
    }

    this._connectionErrorHandler()(Client._packetToUserObject(packet));
    return;
  }

  // @TODO Simplify the code below and above as well
  var type = packet.type;
  var task = this._queue[0];
  var delegate = (task)
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

Client.prototype._connectionErrorHandler = function() {
  return function(err) {
    this.destroy();

    var task = this._queue[0];
    var delegate = (task)
      ? task.delegate
      : null;

    if (delegate instanceof Query) {
      delegate.emit('error', err);
      return;
    }

    if (!delegate) {
      this.emit('error', err);
    } else {
      delegate(err);
      this._queue.shift();
    }

    if (this._queue.length) {
      this._connect();
    }
  }.bind(this);
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
