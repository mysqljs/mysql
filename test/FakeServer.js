// An experimental fake MySQL server for tricky integration tests. Expanded
// as needed.

var Buffer          = require('safe-buffer').Buffer;
var common          = require('./common');
var Charsets        = common.Charsets;
var ClientConstants = common.ClientConstants;
var Crypto          = require('crypto');
var Net             = require('net');
var tls             = require('tls');
var Packets         = common.Packets;
var PacketWriter    = common.PacketWriter;
var Parser          = common.Parser;
var Types           = common.Types;
var Errors          = common.Errors;
var EventEmitter    = require('events').EventEmitter;
var Util            = require('util');

module.exports = FakeServer;
Util.inherits(FakeServer, EventEmitter);
function FakeServer() {
  EventEmitter.call(this);

  this._server      = null;
  this._connections = [];
}

FakeServer.prototype.listen = function(port, cb) {
  this._server = Net.createServer(this._handleConnection.bind(this));
  this._server.listen(port, cb);
};

FakeServer.prototype._handleConnection = function(socket) {
  var connection = new FakeConnection(socket);

  if (!this.emit('connection', connection)) {
    connection.handshake();
  }

  this._connections.push(connection);
};

FakeServer.prototype.destroy = function() {
  if (this._server._handle) {
    // close server if listening
    this._server.close();
  }

  // destroy all connections
  this._connections.forEach(function(connection) {
    connection.destroy();
  });
};

Util.inherits(FakeConnection, EventEmitter);
function FakeConnection(socket) {
  EventEmitter.call(this);

  this.database = null;
  this.user     = null;

  this._cipher = null;
  this._socket = socket;
  this._stream = socket;
  this._parser = new Parser({onPacket: this._parsePacket.bind(this)});

  this._expectedNextPacket            = null;
  this._handshakeInitializationPacket = null;
  this._handshakeOptions              = {};

  socket.on('data', this._handleData.bind(this));
}

FakeConnection.prototype.authSwitchRequest = function authSwitchRequest(options) {
  this._sendPacket(new Packets.AuthSwitchRequestPacket(options));
};

FakeConnection.prototype.deny = function deny(message, errno) {
  message = message || 'Access Denied';
  errno   = errno || Errors.ER_ACCESS_DENIED_ERROR;
  this.error(message, errno);
};

FakeConnection.prototype.error = function deny(message, errno) {
  this._sendPacket(new Packets.ErrorPacket({
    message : (message || 'Error'),
    errno   : (errno || Errors.ER_UNKNOWN_COM_ERROR)
  }));
  this._parser.resetPacketNumber();
};

FakeConnection.prototype.handshake = function(options) {
  this._handshakeOptions = options || {};

  var packetOptions = common.extend({
    scrambleBuff1       : Buffer.from('1020304050607080', 'hex'),
    scrambleBuff2       : Buffer.from('0102030405060708090A0B0C', 'hex'),
    serverCapabilities1 : 512, // only 1 flag, PROTOCOL_41
    protocol41          : true
  }, this._handshakeOptions);

  this._handshakeInitializationPacket = new Packets.HandshakeInitializationPacket(packetOptions);

  this._sendPacket(this._handshakeInitializationPacket);
};

FakeConnection.prototype.ok = function ok() {
  this._sendPacket(new Packets.OkPacket());
  this._parser.resetPacketNumber();
};

FakeConnection.prototype._sendAuthResponse = function _sendAuthResponse(got, expected) {
  if (expected.toString('hex') === got.toString('hex')) {
    this.ok();
  } else {
    this.deny('expected ' + expected.toString('hex') + ' got ' + got.toString('hex'));
  }

  this._parser.resetPacketNumber();
};

FakeConnection.prototype._sendPacket = function(packet) {
  switch (packet.constructor) {
    case Packets.AuthSwitchRequestPacket:
      this._expectedNextPacket = Packets.AuthSwitchResponsePacket;
      break;
    case Packets.HandshakeInitializationPacket:
      this._expectedNextPacket = Packets.ClientAuthenticationPacket;
      break;
    case Packets.UseOldPasswordPacket:
      this._expectedNextPacket = Packets.OldPasswordPacket;
      break;
    default:
      this._expectedNextPacket = null;
      break;
  }

  var writer = new PacketWriter();
  packet.write(writer);
  this._stream.write(writer.toBuffer(this._parser));
};

FakeConnection.prototype._handleData = function(buffer) {
  this._parser.write(buffer);
};

FakeConnection.prototype._handleQueryPacket = function _handleQueryPacket(packet) {
  var conn = this;
  var match;
  var sql = packet.sql;

  if ((match = /^SELECT ([0-9]+);?$/i.exec(sql))) {
    var num = match[1];

    this._sendPacket(new Packets.ResultSetHeaderPacket({
      fieldCount: 1
    }));

    this._sendPacket(new Packets.FieldPacket({
      catalog    : 'def',
      charsetNr  : Charsets.UTF8_GENERAL_CI,
      default    : '0',
      name       : num,
      protocol41 : true,
      type       : Types.LONG
    }));

    this._sendPacket(new Packets.EofPacket());

    var writer = new PacketWriter();
    writer.writeLengthCodedString(num);
    this._socket.write(writer.toBuffer(this._parser));

    this._sendPacket(new Packets.EofPacket());
    this._parser.resetPacketNumber();
    return;
  }

  if ((match = /^SELECT CURRENT_USER\(\);?$/i.exec(sql))) {
    this._sendPacket(new Packets.ResultSetHeaderPacket({
      fieldCount: 1
    }));

    this._sendPacket(new Packets.FieldPacket({
      catalog    : 'def',
      charsetNr  : Charsets.UTF8_GENERAL_CI,
      name       : 'CURRENT_USER()',
      protocol41 : true,
      type       : Types.VARCHAR
    }));

    this._sendPacket(new Packets.EofPacket());

    var writer = new PacketWriter();
    writer.writeLengthCodedString((this.user || '') + '@localhost');
    this._socket.write(writer.toBuffer(this._parser));

    this._sendPacket(new Packets.EofPacket());
    this._parser.resetPacketNumber();
    return;
  }

  if ((match = /^SELECT SLEEP\(([0-9]+)\);?$/i.exec(sql))) {
    var sec = match[1];
    var time = sec * 1000;

    setTimeout(function () {
      conn._sendPacket(new Packets.ResultSetHeaderPacket({
        fieldCount: 1
      }));

      conn._sendPacket(new Packets.FieldPacket({
        catalog    : 'def',
        charsetNr  : Charsets.UTF8_GENERAL_CI,
        name       : 'SLEEP(' + sec + ')',
        protocol41 : true,
        type       : Types.LONG
      }));

      conn._sendPacket(new Packets.EofPacket());

      var writer = new PacketWriter();
      writer.writeLengthCodedString(0);
      conn._socket.write(writer.toBuffer(conn._parser));

      conn._sendPacket(new Packets.EofPacket());
      conn._parser.resetPacketNumber();
    }, time);
    return;
  }

  if ((match = /^SELECT \* FROM stream LIMIT ([0-9]+);?$/i.exec(sql))) {
    var num = match[1];

    this._writePacketStream(num);
    return;
  }

  if ((match = /^SHOW STATUS LIKE 'Ssl_cipher';?$/i.exec(sql))) {
    this._sendPacket(new Packets.ResultSetHeaderPacket({
      fieldCount: 2
    }));

    this._sendPacket(new Packets.FieldPacket({
      catalog    : 'def',
      charsetNr  : Charsets.UTF8_GENERAL_CI,
      name       : 'Variable_name',
      protocol41 : true,
      type       : Types.VARCHAR
    }));

    this._sendPacket(new Packets.FieldPacket({
      catalog    : 'def',
      charsetNr  : Charsets.UTF8_GENERAL_CI,
      name       : 'Value',
      protocol41 : true,
      type       : Types.VARCHAR
    }));

    this._sendPacket(new Packets.EofPacket());

    var writer = new PacketWriter();
    writer.writeLengthCodedString('Ssl_cipher');
    writer.writeLengthCodedString(this._cipher ? this._cipher.name : '');
    this._stream.write(writer.toBuffer(this._parser));

    this._sendPacket(new Packets.EofPacket());
    this._parser.resetPacketNumber();
    return;
  }

  if (/INVALID/i.test(sql)) {
    this.error('Invalid SQL', Errors.ER_PARSE_ERROR);
    return;
  }

  this.error('Interrupted unknown query', Errors.ER_QUERY_INTERRUPTED);
};

FakeConnection.prototype._parsePacket = function _parsePacket(packetHeader) {
  var Packet = this._determinePacket(packetHeader);
  var packet = new Packet({protocol41: true});

  packet.parse(this._parser);

  switch (Packet) {
    case Packets.AuthSwitchResponsePacket:
      if (!this.emit('authSwitchResponse', packet)) {
        this.deny('No auth response handler');
      }
      break;
    case Packets.ClientAuthenticationPacket:
      this.database = (packet.database || null);
      this.user     = (packet.user || null);

      if (!this.emit('clientAuthentication', packet)) {
        this.ok();
      }
      break;
    case Packets.SSLRequestPacket:
      this._startTLS();
      break;
    case Packets.ComQueryPacket:
      if (!this.emit('query', packet)) {
        this._handleQueryPacket(packet);
      }
      break;
    case Packets.ComPingPacket:
      if (!this.emit('ping', packet)) {
        this.ok();
      }
      break;
    case Packets.ComChangeUserPacket:
      this.database = (packet.database || null);
      this.user     = (packet.user || null);

      if (!this.emit('changeUser', packet)) {
        if (packet.user === 'does-not-exist') {
          this.deny('User does not exist');
          break;
        } else if (packet.database === 'does-not-exist') {
          this.error('Database does not exist', Errors.ER_BAD_DB_ERROR);
          break;
        }

        this.ok();
      }
      break;
    case Packets.ComQuitPacket:
      if (!this.emit('quit', packet)) {
        this._socket.end();
      }
      break;
    default:
      if (!this.emit(packet.constructor.name, packet)) {
        throw new Error('Unexpected packet: ' + Packet.name);
      }
  }
};

FakeConnection.prototype._determinePacket = function _determinePacket(packetHeader) {
  if (this._expectedNextPacket) {
    var Packet = this._expectedNextPacket;

    if (Packet === Packets.ClientAuthenticationPacket) {
      return !this._cipher && (this._parser.peak(1) << 8) & ClientConstants.CLIENT_SSL
        ? Packets.SSLRequestPacket
        : Packets.ClientAuthenticationPacket;
    }

    this._expectedNextPacket = null;

    return Packet;
  }

  if (packetHeader.length === 0) {
    return Packets.EmptyPacket;
  }

  var firstByte = this._parser.peak();
  switch (firstByte) {
    case 0x01: return Packets.ComQuitPacket;
    case 0x03: return Packets.ComQueryPacket;
    case 0x0e: return Packets.ComPingPacket;
    case 0x11: return Packets.ComChangeUserPacket;
    default:
      throw new Error('Unknown packet, first byte: ' + firstByte);
  }
};

FakeConnection.prototype.destroy = function() {
  this._socket.destroy();
};

FakeConnection.prototype._writePacketStream = function _writePacketStream(count) {
  var remaining = count;
  var timer = setInterval(writeRow.bind(this), 20);

  this._socket.on('close', cleanup);
  this._socket.on('error', cleanup);

  this._sendPacket(new Packets.ResultSetHeaderPacket({
    fieldCount: 2
  }));

  this._sendPacket(new Packets.FieldPacket({
    catalog    : 'def',
    charsetNr  : Charsets.UTF8_GENERAL_CI,
    name       : 'id',
    protocol41 : true,
    type       : Types.LONG
  }));

  this._sendPacket(new Packets.FieldPacket({
    catalog    : 'def',
    charsetNr  : Charsets.UTF8_GENERAL_CI,
    name       : 'title',
    protocol41 : true,
    type       : Types.VARCHAR
  }));

  this._sendPacket(new Packets.EofPacket());

  function cleanup() {
    clearInterval(timer);
  }

  function writeRow() {
    if (remaining === 0) {
      cleanup();

      this._socket.removeListener('close', cleanup);
      this._socket.removeListener('error', cleanup);

      this._sendPacket(new Packets.EofPacket());
      this._parser.resetPacketNumber();
      return;
    }

    remaining -= 1;

    var num = count - remaining;
    var writer = new PacketWriter();
    writer.writeLengthCodedString(num);
    writer.writeLengthCodedString('Row #' + num);
    this._socket.write(writer.toBuffer(this._parser));
  }
};

if (tls.TLSSocket) {
  // 0.11+ environment
  FakeConnection.prototype._startTLS = function _startTLS() {
    // halt parser
    this._parser.pause();
    this._socket.removeAllListeners('data');

    // socket <-> encrypted
    var secureContext = tls.createSecureContext(common.getSSLConfig());
    var secureSocket  = new tls.TLSSocket(this._socket, {
      secureContext : secureContext,
      isServer      : true
    });

    // cleartext <-> protocol
    secureSocket.on('data', this._handleData.bind(this));
    this._stream = secureSocket;

    var conn = this;
    secureSocket.on('secure', function () {
      conn._cipher = this.getCipher();
    });

    // resume
    var parser = this._parser;
    process.nextTick(function() {
      var buffer = parser._buffer.slice(parser._offset);
      parser._offset = parser._buffer.length;
      parser.resume();
      secureSocket.ssl.receive(buffer);
    });
  };
} else {
  // pre-0.11 environment
  FakeConnection.prototype._startTLS = function _startTLS() {
    // halt parser
    this._parser.pause();
    this._socket.removeAllListeners('data');

    // inject secure pair
    var credentials = Crypto.createCredentials(common.getSSLConfig());
    var securePair = tls.createSecurePair(credentials, true);
    this._socket.pipe(securePair.encrypted);
    this._stream = securePair.cleartext;
    securePair.cleartext.on('data', this._handleData.bind(this));
    securePair.encrypted.pipe(this._socket);

    var conn = this;
    securePair.on('secure', function () {
      conn._cipher = securePair.cleartext.getCipher();
    });

    // resume
    var parser = this._parser;
    process.nextTick(function() {
      var buffer = parser._buffer.slice(parser._offset);
      parser._offset = parser._buffer.length;
      parser.resume();
      securePair.encrypted.write(buffer);
    });
  };
}
