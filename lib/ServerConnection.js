var Packets      = require('./protocol/packets');
var PacketWriter = require('./protocol/PacketWriter');
var Parser       = require('./protocol/Parser');
var Auth         = require('./protocol/Auth');
var EventEmitter = require('events').EventEmitter;
var types        = require('./protocol/constants/types');
var commands     = require('./protocol/constants/commands');
var errors       = require('./protocol/constants/errors');
var util         = require('util');

module.exports = ServerConnection;
util.inherits(ServerConnection, EventEmitter);
function ServerConnection(options) {
  EventEmitter.call(this);

  this._socket                     = null;
  this._scramleBuff                = null;
  this._clientAuthenticationPacket = null;
  this._parser                     = new Parser({onPacket: this._handlePacket.bind(this)});

  if (options.socket) this.setSocket(options.socket);
}

ServerConnection.prototype.setSocket = function(socket) {
  this._socket = socket;

  var self = this;
  this._socket.on('data', function(buffer) {
    self._parser.write(buffer);
  });
};

ServerConnection.prototype.greet = function(options) {
  options = options || {};

  this._setRandomScrambleBuff();

  var packet = new Packets.HandshakeInitializationPacket({
    protocolVersion     : options.protocolVersion || 10,
    serverVersion       : options.serverVersion || 'node-mysql', // @TODO add version number
    threadId            : options.threadId || process.pid,
    scrambleBuff1       : this._scramleBuff.slice(0, 8),
    serverCapabilities1 : options.serverCapabilities1 || 0,
    serverLanguage      : options.serverLanguage || 0,
    serverStatus        : options.serverStatus || 0,
    scrambleBuff2       : this._scramleBuff.slice(8, 20),
    serverCapabilities2 : options.serverCapabilities2 || 0,
    scrambeLength       : options.scrambeLength || 21,
    pluginData          : options.pluginData,
  });

  this._send(packet);
};

ServerConnection.prototype.verifyPassword = function(auth, password) {
  var expectedScrambleBuff = Auth.token(password, this._scramleBuff);
  var actualScrambleBuff   = auth.scrambleBuff;

  var usesPassword = true;
  for (var i = 0; i < expectedScrambleBuff.length; i++) {
    if (expectedScrambleBuff[i] !== actualScrambleBuff[i]) {
      // No return here to avoid timing attacks
      usesPassword = false;
    }
  }

  return usesPassword;
};

ServerConnection.prototype.accept = function(options) {
  this.ok(options);
};

ServerConnection.prototype.deny = function(options) {
  options         = options || {};
  options.code    = options.code || 'ER_ACCESS_DENIED_ERROR';
  options.message = options.message || 'Access Denied.';

  this.error(options);
};

ServerConnection.prototype.ok = function(options) {
  options = options || {};

  var packet = new Packets.OkPacket({
    affectedRows : options.affectedRows || 0,
    insertId     : options.insertId || 0,
    serverStatus : options.serverStatus || 0,
    message      : options.message || '',
  });

  this._send(packet);

  this._parser.resetPacketNumber();
};

ServerConnection.prototype.error = function(options) {
  options = options || {};
  options.code = options.code || 'ER_UNKNOWN_ERROR';

  var invalidCode = true;
  for (var errno in errors) {
    var code = errors[errno];

    if (code === options.code) {
      invalidCode = false;
      break;
    }
  }

  if (invalidCode) {
    throw new Error('Invalid error code: ' + options.code);
  }

  var packet = new Packets.ErrorPacket({
    errno          : errno,
    sqlStateMarker : options.sqlStateMarker || '#',
    sqlState       : options.sqlState || '00000',
    message        : options.message || '',
  });

  this._send(packet);

  this._parser.resetPacketNumber();

};

ServerConnection.prototype.results = function(results) {
  var fields = this.buildFields(results);

  this.resultHeader({fieldCount: fields.length});
  this.fields(fields);
  this.eof();
  results.forEach(this.result.bind(this));
  this.eof({last: true});
};

ServerConnection.prototype.resultHeader = function(options) {
  options = options || {};

  var packet = new Packets.ResultSetHeaderPacket({
    fieldCount : options.fieldCount || 0,
    extra      : options.extra,
  });

  this._send(packet);
};

ServerConnection.prototype.buildFields = function(results) {
  results = [].concat(results);

  var firstResult = results[0];
  var fields   = [];

  for (var field in firstResult) {
    var value = firstResult[field];

    fields.push({
      name    : field,
      type    : 'STRING',
    });
  }

  return fields;
};

ServerConnection.prototype.fields = function(fields) {
  fields.forEach(this.field.bind(this));
};

ServerConnection.prototype.field = function(options) {
  options = options || {};

  options.catalog = options.catalog || 'def';

  var packet = new Packets.FieldPacket(options);

  this._send(packet);
};

ServerConnection.prototype.result = function(result) {
  var writer = new PacketWriter();

  for (var field in result) {
    var value = result[field];
    writer.writeLengthCodedString(value);
  }

  this._socket.write(writer.toBuffer(this._parser));
};

ServerConnection.prototype.eof = function(options, last) {
  options = options || {};

  var packet = new Packets.EofPacket(options);

  this._send(packet);

  if (options.last) {
    this._parser.resetPacketNumber();
  }
};

ServerConnection.prototype._handlePacket = function(header) {
  var Packet   = this._determinePacket(header);
  var packet   = new Packet();

  packet.parse(this._parser);

  this[Packet.name](packet);
};

ServerConnection.prototype['ClientAuthenticationPacket'] = function(packet) {
  this._clientAuthenticationPacket = packet;
  this.emit('auth', packet);
};

ServerConnection.prototype['ComQueryPacket'] = function(packet) {
  this.emit('query', packet);
};

ServerConnection.prototype['ComQuitPacket'] = function(packet) {
  this.end();
};

ServerConnection.prototype.end = function() {
  this._socket.end();
};

ServerConnection.prototype._determinePacket = function(header) {
  if (!this._clientAuthenticationPacket) {
    return Packets.ClientAuthenticationPacket;
  }

  var byte = this._parser.peak();
  switch (byte) {
    case commands.COM_QUIT:
      return Packets.ComQuitPacket;
    case commands.COM_QUERY:
      return Packets.ComQueryPacket;
    default:
      // @TODO, emit this
      throw new Error('Unsupported packet: ' + byte);
      break;
  }
};

ServerConnection.prototype._setRandomScrambleBuff = function() {
  var scrambleBuff = new Buffer(20);
  for (var i = 0; i < scrambleBuff.length; i++) {
    scrambleBuff[i] = Math.floor(Math.random() * 256);
  }

  this._scramleBuff = scrambleBuff;
};

ServerConnection.prototype._send = function(packet) {
  var writer = new PacketWriter();
  packet.write(writer);
  this._socket.write(writer.toBuffer(this._parser));
};
