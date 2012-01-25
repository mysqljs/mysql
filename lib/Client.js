var _              = require('underscore');
var util           = require('util');
var Socket         = require('net').Socket;
var constants      = require('./Constants');
var Parser         = require('./Parser');
var OutgoingPacket = require('./OutgoingPacket');
var Query          = require('./Query');
var SqlString      = require('./SqlString');
var Debugger       = require('./Debugger');
var Protocol       = require('./protocol/Protocol');
var EventEmitter   = require('events').EventEmitter;

function Client(properties) {
  if (!(this instanceof Client)) {
    throw new Error('deprecated: use mysql.createClient() instead');
  }

  EventEmitter.call(this);

  this.host     = 'localhost';
  this.port     = 3306;
  this.user     = 'root';
  this.password = null;
  this.database = '';

  this.typeCast      = true;
  this.flags         = Client.defaultFlags;
  this.maxPacketSize = 0x01000000;
  this.charsetNumber = constants.UTF8_UNICODE_CI;
  this.debug         = false;
  this.ending        = false;
  this.connected     = false;

  this._debugger = new Debugger();
  this._queue    = [];
  this._socket   = null;
  this._parser   = null;
  this._protocol = null;

  _.extend(this, properties);
};
util.inherits(Client, EventEmitter);
module.exports = Client;

Client.create = function(properties) {
  return new Client(properties);
};

Client.prototype.connect = function() {
  throw new Error('deprecated: connect() is now done automatically.');
};

Client.prototype._connect = function() {
  this.destroy();

  this._protocol = new Protocol();

  var self = this;
  this._protocol
    .on('error', function(packet) {
      self._onError(Client._packetToUserObject(packet));
    })
    .on('data', function(data) {
      self._socket.write(data);
    });

  this._socket    = new Socket();
  this._parser    = new Parser();

  this._socket
    .on('error', this._onError.bind(this))
    .on('data', function(buffer) {
      try {
        var written = (!self.connected)
          ? self._protocol.write(buffer)
          : 0;
      } catch (err) {
        self._onError(err);
        return;
      }

      self._parser.write(buffer.slice(written));
    })
    .on('end', this._onEnd.bind(this))
    .connect(this.port, this.host);

  this._parser.on('packet', this._handlePacket.bind(this));

  this._protocol.authenticate({
    password      : this.password,
    user          : this.user,
    database      : this.database,
    flags         : this.flags,
    maxPacketSize : this.maxPacketSize,
    charsetNumber : this.charsetNumber,
  }, function(err, info) {
    if (err) return self._onError(Client._packetToUserObject(packet));

    self.connected = true;
    if (self._queue.length) self._queue[0].fn();
  });
};

Client.prototype.queryWithEvents = function(sql, params, emitter) {
  if (Array.isArray(params)) {
    sql = this.format(sql, params);
  } else {
    emitter = arguments[1];
  }

  var query = new Query({
    typeCast: this.typeCast,
    sql: sql
  });

  var self = this;
  query.on('error', function (err) {
    if (emitter) emitter.emit('error', err);
    self._dequeue();
  });
  if (emitter) {
    query.on('row', function (row) {
      emitter.emit('row', row);
    });
    query.on('field', function (field) {
      emitter.emit('field', field);
    });
  }
  query.on('end', function (result) {
    if (emitter) emitter.emit('end', result);
    self._dequeue();
  });

  this._enqueue(function query() {
    var packet = new OutgoingPacket(1 + Buffer.byteLength(sql, 'utf-8'));

    packet.writeNumber(1, constants.COM_QUERY);
    packet.write(sql, 'utf-8');
    self.write(packet);
  }, query);

  return query;
}

Client.prototype.query = function(sql, params, cb) {
  if (Array.isArray(params)) {
    sql = this.format(sql, params);
  } else {
    cb = arguments[1];
  }

  var rows = [];
  var fields = [];
  var emitter = new EventEmitter();
  emitter.on('row', function(row) { rows.push(row); });
  emitter.on('field', function(field) { fields[field.name] = field; });
  emitter.on('end', function(result) {
    if (result) {
      cb(null, result);
    } else {
      cb(null, rows, fields);
    }
  });
  emitter.on('error', function(err) { cb(err); });
  return this.queryWithEvents(sql, params, emitter);
};

Client.prototype.write = function(packet) {
  if (this.debug) this._debugger.outgoingPacket(packet);

  var buffer = (typeof packet.toBuffer === 'function')
    ? packet.toBuffer()
    : packet.buffer; // @TODO REFACTOR WIP, REMOVE

  this._socket.write(buffer);
};

Client.prototype.format = SqlString.format;
Client.prototype.escape = SqlString.escape;

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
  if (this.debug) this._debugger.incomingPacket(packet);

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


Client.prototype._onError = function(err) {
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
};

Client.prototype._onEnd = function() {
  if (this.ending) {
    // @todo destroy()?
    this.connected = false;
    this.ending = false;

    if (this._queue.length) {
      this._connect();
    }

    return;
  }

  if (!this.connected) {
    this.emit('error', new Error('reconnection attempt failed before connection was fully set up'));
    return;
  }

  this._connect();
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
