if (global.GENTLY) require = GENTLY.hijack(require);

var sys = require('sys')
  , Stream = require('net').Stream
  , auth = require('./auth')
  , Parser = require('./parser')
  , OutgoingPacket = require('./outgoing_packet')
  , EventEmitter = require('events').EventEmitter;

function Client(config) {
  if (!(this instanceof Client)) {
    return new Client(config);
  }

  EventEmitter.call(this);

  this.host = 'localhost';
  this.port = 3306;
  this.user = null;
  this.password = null;
  this.database = null;

  this.flags = Client.defaultFlags;
  this.maxPacketSize = 0x01000000;
  this.charsetNumber = 8;

  this._connection = null;
  this._parser = null;
  this._callback = null;

  for (var key in config) {
    this[key] = config[key];
  }
}
sys.inherits(Client, EventEmitter);
module.exports = Client;

// Client Flags
Client.LONG_PASSWORD      = 1;
Client.FOUND_ROWS         = 2;
Client.LONG_FLAG          = 4;
Client.CONNECT_WITH_DB    = 8;
Client.NO_SCHEMA          = 16;
Client.COMPRESS           = 32;
Client.ODBC               = 64;
Client.LOCAL_FILES        = 128
Client.IGNORE_SPACE       = 256;
Client.PROTOCOL_41        = 512;
Client.INTERACTIVE        = 1024;
Client.SSL                = 2048;
Client.IGNORE_SIGPIPE     = 4096;
Client.TRANSACTIONS       = 8192;
Client.RESERVED           = 16384;
Client.SECURE_CONNECTION  = 32768;
Client.MULTI_STATEMENTS   = 65536;
Client.MULTI_RESULTS      = 131072;

Client.defaultFlags =
    Client.LONG_PASSWORD
  | Client.FOUND_ROWS
  | Client.LONG_FLAG
  | Client.CONNECT_WITH_DB
  | Client.NO_SCHEMA
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

Client.prototype.connect = function(cb) {
  var connection = this._connection = new Stream()
    , parser = this._parser = new Parser()
    , self = this;

  this._callback = cb;

  connection.connect(this.port, this.host);
  connection
    .on('error', function(err) {
      self.emit('error', err);
    })
    .on('data', function(b) {
      parser.write(b);
    });

  parser
    .on('packet', function(packet) {
      switch (packet.type) {
        case Parser.GREETING_PACKET:
          self._sendAuthenticationPacket(packet);
          break;
        case Parser.ERROR_PACKET:
          self._error(packet);
          break;
        default:
          console.log('unknown packet: %j', packet);
          break;
      }
    });
};

Client.prototype._sendAuthenticationPacket = function(greeting) {
  // Bytes                        Name
  //  -----                        ----
  //  4                            client_flags
  //  4                            max_packet_size
  //  1                            charset_number
  //  23                           (filler) always 0x00...
  //  n (Null-Terminated String)   user
  //  n (Length Coded Binary)      scramble_buff (1 + x bytes)
  //  n (Null-Terminated String)   databasename (optional)

  var token = auth.token(this.password, greeting.scrambleBuffer)
    , packetSize =
          4 + 4 + 1 + 23
        + this.user.length + 1
        + token.length + 1
        + this.database.length + 1
    , packet = new OutgoingPacket(packetSize, greeting.number+1);

  packet.writeNumber(4, this.flags);
  packet.writeNumber(4, this.maxPacketSize);
  packet.writeNumber(1, this.charsetNumber);
  packet.writeFiller(23);
  packet.writeNullTerminated(this.user);
  packet.writeLengthCoded(token);
  packet.writeNullTerminated(this.database);

  this.write(packet);
};

Client.prototype.write = function(packet) {
  this._connection.write(packet.buffer);
};

Client.prototype._error = function(packet) {
  var err = new Error(packet.errorMessage);
  err.number = packet.errorNumber;

  if (!this._callback) {
    this.emit('error', err);
    return;
  }

  this._callback(err);
};