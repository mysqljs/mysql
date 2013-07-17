var Net              = require('net');
var ConnectionConfig = require('./ConnectionConfig');
var Protocol         = require('./protocol/Protocol');
var SqlString        = require('./protocol/SqlString');
var Query            = require('./protocol/sequences/Query');
var EventEmitter     = require('events').EventEmitter;
var Util             = require('util');

module.exports = Connection;
Util.inherits(Connection, EventEmitter);
function Connection(options) {
  EventEmitter.call(this);

  this.config = options.config;

  this._socket        = options.socket;
  this._protocol      = new Protocol({config: this.config, connection: this});
  this._connectCalled = false;
  this.state          = "disconnected";
}

Connection.createQuery = function(sql, values, cb) {
  if (sql instanceof Query) {
    return sql;
  }

  var options = {};

  if (typeof sql === 'object') {
    // query(options, cb)
    options = sql;
    if (typeof values === 'function') {
      cb = values;
    } else {
      options.values = values;
    }
  } else if (typeof values === 'function') {
    // query(sql, cb)
    cb             = values;
    options.sql    = sql;
    options.values = undefined;
  } else {
    // query(sql, values, cb)
    options.sql    = sql;
    options.values = values;
  }
  return new Query(options, cb);
};

Connection.prototype.connect = function(cb) {
  if (!this._connectCalled) {
    this._connectCalled = true;

    this._socket = (this.config.socketPath)
      ? Net.createConnection(this.config.socketPath)
      : Net.createConnection(this.config.port, this.config.host);

    // Node v0.10+ Switch socket into "old mode" (Streams2)
    this._socket.on("data",function() {});

    this._socket.pipe(this._protocol);
    this._protocol.pipe(this._socket);

    this._socket.on('error', this._handleNetworkError.bind(this));
    this._socket.on('connect', this._handleProtocolConnect.bind(this));
    this._protocol.on('handshake', this._handleProtocolHandshake.bind(this));
    this._protocol.on('unhandledError', this._handleProtocolError.bind(this));
    this._protocol.on('drain', this._handleProtocolDrain.bind(this));
    this._protocol.on('end', this._handleProtocolEnd.bind(this));
  }

  this._protocol.handshake(cb);
};

Connection.prototype.changeUser = function(options, cb){
  this._implyConnect();

  if (typeof options === 'function') {
    cb      = options;
    options = {};
  }

  var charsetNumber = (options.charset)
    ? Config.getCharsetNumber(options.charset)
    : this.config.charsetNumber;

  return this._protocol.changeUser({
    user          : options.user || this.config.user,
    password      : options.password || this.config.password,
    database      : options.database || this.config.database,
    charsetNumber : charsetNumber,
    currentConfig : this.config
  }, cb);
};

Connection.prototype.query = function(sql, values, cb) {
  this._implyConnect();

  var query = Connection.createQuery(sql, values, cb);
  query._connection = this;

  if (!(typeof sql == 'object' && 'typeCast' in sql)) {
    query.typeCast = this.config.typeCast;
  }

  query.sql = this.format(query.sql, query.values || []);

  return this._protocol._enqueue(query);
};

// Returns single row as associative array of fields
//
Connection.prototype.queryRow = function(sql, values, callback) {
  this.query(sql, values, function(err, res, fields) {
    if (err) res = false; else res = res[0] ? res[0] : false;
    callback(err, res, fields);
  });
}

// Returns single value (scalar)
//
Connection.prototype.queryValue = function(sql, values, callback) {
  this.queryRow(sql, values, function(err, res, fields) {
    if (err) res = false; else res = res[Object.keys(res)[0]];
    callback(err, res, fields);
  });
}

// Query returning array of first field values
//
Connection.prototype.queryArray = function(sql, values, callback) {
  this.query(sql, values, function(err, res, fields) {
    var result = [];
    if (err) result = false; else {
      for (var i in res) {
        var row = res[i];
        result.push(row[Object.keys(row)[0]]);
      }
    }
    callback(err, result, fields);
  });
}

// Query returning hash (associative array), first field will be array key
//
Connection.prototype.queryHash = function(sql, values, callback) {
  this.query(sql, values, function(err, res, fields) {
    var result = {};
    if (err) result = false; else {
      for (var i in res) {
        var row = res[i];
        result[row[Object.keys(row)[0]]] = row;
      }
    }
    callback(err, result, fields);
  });
}

// Query returning key-value array, first field of query will be key and second will be value
//
Connection.prototype.queryKeyValue = function(sql, values, callback) {
  this.query(sql, values, function(err, res, fields) {
    var result = {};
    if (err) result = false; else {
      for (var i in res) {
        var row = res[i];
        result[row[Object.keys(row)[0]]] = row[Object.keys(row)[1]];
      }
    }
    callback(err, result, fields);
  });
}

Connection.prototype.count = function(table, callback) {
  this.queryValue('SELECT count(*) FROM ??', [table], function(err, res) {
    callback(err, res);
  });
}


Connection.prototype.ping = function(cb) {
  this._implyConnect();
  this._protocol.ping(cb);
};

Connection.prototype.statistics = function(cb) {
  this._implyConnect();
  this._protocol.stats(cb);
};

Connection.prototype.end = function(cb) {
  this._implyConnect();
  this._protocol.quit(cb);
};

Connection.prototype.destroy = function() {
  this.state = "disconnected";
  this._implyConnect();
  this._socket.destroy();
  this._protocol.destroy();
};

Connection.prototype.pause = function() {
  this._socket.pause();
  this._protocol.pause();
};

Connection.prototype.resume = function() {
  this._socket.resume();
  this._protocol.resume();
};

Connection.prototype.escape = function(value) {
  return SqlString.escape(value, false, this.config.timezone);
};

Connection.prototype.format = function(sql, values) {
  if (typeof this.config.queryFormat == "function") {
    return this.config.queryFormat.call(this, sql, values, this.config.timezone);
  }
  return SqlString.format(sql, values, this.config.stringifyObjects, this.config.timezone);
};

Connection.prototype._handleNetworkError = function(err) {
  this._protocol.handleNetworkError(err);
};

Connection.prototype._handleProtocolError = function(err) {
  this.state = "protocol_error";
  this.emit('error', err);
};

Connection.prototype._handleProtocolDrain = function() {
  this.emit('drain');
};

Connection.prototype._handleProtocolConnect = function() {
  this.state = "connected";
};

Connection.prototype._handleProtocolHandshake = function() {
  this.state = "authenticated";
};

Connection.prototype._handleProtocolEnd = function(err) {
  this.state = "disconnected";
  this.emit('end', err);
};

Connection.prototype._implyConnect = function() {
  if (!this._connectCalled) {
    this.connect();
  }
};
