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

  this._queue = [];
  this._connection = null;
  this._parser = null;

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

Client.COM_SLEEP                = 0x00;
Client.COM_QUIT                 = 0x01;
Client.COM_INIT_DB              = 0x02;
Client.COM_QUERY                = 0x03;
Client.COM_FIELD_LIST           = 0x04;
Client.COM_CREATE_DB            = 0x05;
Client.COM_DROP_DB              = 0x06;
Client.COM_REFRESH              = 0x07;
Client.COM_SHUTDOWN             = 0x08;
Client.COM_STATISTICS           = 0x09;
Client.COM_PROCESS_INFO         = 0x0a;
Client.COM_CONNECT              = 0x0b;
Client.COM_PROCESS_KILL         = 0x0c;
Client.COM_DEBUG                = 0x0d;
Client.COM_PING                 = 0x0e;
Client.COM_TIME                 = 0x0f;
Client.COM_DELAYED_INSERT       = 0x10;
Client.COM_CHANGE_USER          = 0x11;
Client.COM_BINLOG_DUMP          = 0x12;
Client.COM_TABLE_DUMP           = 0x13;
Client.COM_CONNECT_OUT          = 0x14;
Client.COM_REGISTER_SLAVE       = 0x15;
Client.COM_STMT_PREPARE         = 0x16;
Client.COM_STMT_EXECUTE         = 0x17;
Client.COM_STMT_SEND_LONG_DATA  = 0x18;
Client.COM_STMT_CLOSE           = 0x19;
Client.COM_STMT_RESET           = 0x1a;
Client.COM_SET_OPTION           = 0x1b;
Client.COM_STMT_FETCH           = 0x1c;

Client.prototype.connect = function(cb) {
  var self = this;
  this._enqueue(function() {
    var connection = self._connection = new Stream()
      , parser = self._parser = new Parser();

    connection.connect(self.port, self.host);
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
            self._greetingPacket(packet);
            break;
          case Parser.ERROR_PACKET:
            self._errorPacket(packet);
            break;
          case Parser.OK_PACKET:
            self._okPacket(packet);
            break;
          default:
            console.log('unknown packet: %j', packet);
            break;
        }
      });
  }, cb);
};

Client.prototype.query = function(sql, cb) {
  var self = this;
  this._enqueue(function() {
    var packet = new OutgoingPacket(Buffer.byteLength(sql, 'utf-8') + 1);

    packet.writeNumber(1, Client.COM_QUERY);
    packet.write(sql, 'utf-8');
    self.write(packet);
  }, cb);
};

Client.prototype._greetingPacket = function(greeting) {
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

Client.prototype._errorPacket = function(packet) {
  var err = new Error(packet.errorMessage);
  err.number = packet.errorNumber;

  this._dequeue(err);
};

Client.prototype._okPacket = function(packet) {
  var result =
    { affectedRows: packet.affectedRows
    , insertId: packet.insertId
    , serverStatus: 2
    , message: packet.message.replace(/\0/g, '')
    };

  this._dequeue(null, result);
};

Client.prototype._enqueue = function(fn, cb) {
  this._queue.push({fn: fn, cb: cb});
  if (this._queue.length == 1) {
    fn();
  }
};

Client.prototype._dequeue = function(err, result) {
  var task = this._queue.shift();
  if (task.cb) {
    task.cb(err, result);
  } else if (err) {
    this.emit('error', err);
  }

  if (!this._queue.length) {
    return;
  }

  this._queue[0].fn();
};

Client.prototype.end = function() {
  this._connection.end();
};