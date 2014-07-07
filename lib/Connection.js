var Crypto           = require('crypto');
var Net              = require('net');
var tls              = require('tls');
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
  this.threadId       = null;
}

function bindToCurrentDomain(callback) {
  if (!callback) return;

  var domain = process.domain;

  return domain
    ? domain.bind(callback)
    : callback;
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
    } else if (typeof values !== 'undefined') {
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
  return new Query(options, bindToCurrentDomain(cb));
};

Connection.prototype.connect = function connect(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!this._connectCalled) {
    this._connectCalled = true;

    // Connect either via a UNIX domain socket or a TCP socket.
    this._socket = (this.config.socketPath)
      ? Net.createConnection(this.config.socketPath)
      : Net.createConnection(this.config);

    var connection = this;
    this._protocol.on('data', function(data) {
       connection._socket.write(data);
    });
    this._socket.on('data', function(data) {
      connection._protocol.write(data);
    });
    this._protocol.on('end', function() {
       connection._socket.end()
    });
    this._socket.on('end', function(err) {
      connection._protocol.end();
    });

    this._socket.on('error', this._handleNetworkError.bind(this));
    this._socket.on('connect', this._handleProtocolConnect.bind(this));
    this._protocol.on('handshake', this._handleProtocolHandshake.bind(this));
    this._protocol.on('unhandledError', this._handleProtocolError.bind(this));
    this._protocol.on('drain', this._handleProtocolDrain.bind(this));
    this._protocol.on('end', this._handleProtocolEnd.bind(this));

    if (this.config.connectTimeout) {
      var handleConnectTimeout = this._handleConnectTimeout.bind(this);

      this._socket.setTimeout(this.config.connectTimeout, handleConnectTimeout);
      this._socket.once('connect', function() {
        this.setTimeout(0, handleConnectTimeout);
      });
    }
  }

  this._protocol.handshake(options, bindToCurrentDomain(callback));
};

Connection.prototype.changeUser = function changeUser(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect();

  var charsetNumber = (options.charset)
    ? ConnectionConfig.getCharsetNumber(options.charset)
    : this.config.charsetNumber;

  return this._protocol.changeUser({
    user          : options.user || this.config.user,
    password      : options.password || this.config.password,
    database      : options.database || this.config.database,
    timeout       : options.timeout,
    charsetNumber : charsetNumber,
    currentConfig : this.config
  }, bindToCurrentDomain(callback));
};

Connection.prototype.beginTransaction = function beginTransaction(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  options.sql = 'START TRANSACTION';
  options.values = null;
  
  return this.query(options, callback);
};

Connection.prototype.commit = function commit(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  options.sql = 'COMMIT';
  options.values = null;
  
  return this.query(options, callback);
};

Connection.prototype.rollback = function rollback(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  options.sql = 'ROLLBACK';
  options.values = null;
  
  return this.query(options, callback);
};

Connection.prototype.query = function(sql, values, cb) {
  this._implyConnect();

  var query = Connection.createQuery(sql, values, cb);
  query._connection = this;

  if (!(typeof sql == 'object' && 'typeCast' in sql)) {
    query.typeCast = this.config.typeCast;
  }

  query.sql = this.format(query.sql, query.values);

  return this._protocol._enqueue(query);
};

Connection.prototype.ping = function ping(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect();
  this._protocol.ping(options, bindToCurrentDomain(callback));
};

Connection.prototype.statistics = function statistics(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect();
  this._protocol.stats(options, bindToCurrentDomain(callback));
};

Connection.prototype.end = function end(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect();
  this._protocol.quit(options, bindToCurrentDomain(callback));
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

Connection.prototype.escapeId = function escapeId(value) {
  return SqlString.escapeId(value, false);
};

Connection.prototype.format = function(sql, values) {
  if (typeof this.config.queryFormat == "function") {
    return this.config.queryFormat.call(this, sql, values, this.config.timezone);
  }
  return SqlString.format(sql, values, this.config.stringifyObjects, this.config.timezone);
};

if (tls.TLSSocket) {
  // 0.11+ environment
  Connection.prototype._startTLS = function _startTLS(onSecure) {
    var secureContext = tls.createSecureContext({
      key        : this.config.ssl.key,
      cert       : this.config.ssl.cert,
      passphrase : this.config.ssl.passphrase,
      ca         : this.config.ssl.ca
    });

    // "unpipe"
    this._socket.removeAllListeners('data');
    this._protocol.removeAllListeners('data');

    // socket <-> encrypted
    var rejectUnauthorized = this.config.ssl.rejectUnauthorized;
    var secureSocket       = new tls.TLSSocket(this._socket, {
      rejectUnauthorized : rejectUnauthorized,
      requestCert        : true,
      secureContext      : secureContext,
      isServer           : false
    });

    // cleartext <-> protocol
    secureSocket.pipe(this._protocol);
    this._protocol.on('data', function(data) {
      secureSocket.write(data);
    });

    secureSocket.on('secure', function() {
      onSecure(rejectUnauthorized ? this.ssl.verifyError() : null);
    });

    // start TLS communications
    secureSocket._start();
  };
} else {
  // pre-0.11 environment
  Connection.prototype._startTLS = function _startTLS(onSecure) {
    // before TLS:
    //  _socket <-> _protocol
    // after:
    //  _socket <-> securePair.encrypted <-> securePair.cleartext <-> _protocol

    var credentials = Crypto.createCredentials({
      key        : this.config.ssl.key,
      cert       : this.config.ssl.cert,
      passphrase : this.config.ssl.passphrase,
      ca         : this.config.ssl.ca
    });

    var rejectUnauthorized = this.config.ssl.rejectUnauthorized;
    var securePair         = tls.createSecurePair(credentials, false, true, rejectUnauthorized);

    // "unpipe"
    this._socket.removeAllListeners('data');
    this._protocol.removeAllListeners('data');

    // socket <-> encrypted
    securePair.encrypted.pipe(this._socket);
    this._socket.on('data', function(data) {
      securePair.encrypted.write(data);
    });

    // cleartext <-> protocol
    securePair.cleartext.pipe(this._protocol);
    this._protocol.on('data', function(data) {
      securePair.cleartext.write(data);
    });

    securePair.on('secure', function() {
      onSecure(rejectUnauthorized ? this.ssl.verifyError() : null);
    });
  };
}

Connection.prototype._handleConnectTimeout = function() {
  if (this._socket) {
    this._socket.setTimeout(0);
    this._socket.destroy();
  }

  var err = new Error('connect ETIMEDOUT');
  err.errorno = 'ETIMEDOUT';
  err.code = 'ETIMEDOUT';
  err.syscall = 'connect';

  this._handleNetworkError(err);
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

Connection.prototype._handleProtocolHandshake = function _handleProtocolHandshake(packet) {
  this.state    = "authenticated";
  this.threadId = packet.threadId;
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
