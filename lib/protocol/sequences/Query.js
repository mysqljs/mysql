var Sequence     = require('./Sequence');
var Util         = require('util');
var Packets      = require('../packets');
var ResultSet    = require('../ResultSet');
var ServerStatus = require('../constants/server_status');
var fs           = require('fs');
var Readable     = require('stream').Readable;

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(options, callback) {
  Sequence.call(this, callback);

  this.sql = options.sql;
  this.values = options.values;
  this.typeCast = (options.typeCast === undefined)
    ? true
    : options.typeCast;
  this.nestTables = options.nestTables || false;

  this._resultSet = null;
  this._results   = [];
  this._fields    = [];
  this._index     = 0;
  this._loadError = null;
}

Query.prototype.start = function() {
  this.emit('packet', new Packets.ComQueryPacket(this.sql));
};

Query.prototype.determinePacket = function(firstByte, parser) {
  if (firstByte === 0) {
    // If we have a resultSet and got one eofPacket
    if (this._resultSet && this._resultSet.eofPackets.length === 1) {
      // Then this is a RowDataPacket with an empty string in the first column.
      // See: https://github.com/felixge/node-mysql/issues/222
    } else if (this._resultSet && this._resultSet.resultSetHeaderPacket
           && this._resultSet.resultSetHeaderPacket.fieldCount !== null) {
      return Packets.FieldPacket;
    } else {
      return;
    }
  }

  if (firstByte === 255) {
    return;
  }

  // EofPacket's are 5 bytes in mysql >= 4.1
  // This is the only / best way to differentiate their firstByte from a 9
  // byte length coded binary.
  if (firstByte === 0xfe && parser.packetLength() < 9) {
    return Packets.EofPacket;
  }

  if (!this._resultSet) {
    return Packets.ResultSetHeaderPacket;
  }

  return (this._resultSet.eofPackets.length === 0)
    ? Packets.FieldPacket
    : Packets.RowDataPacket;
};

Query.prototype['OkPacket'] = function(packet) {
  // try...finally for exception safety
  try {
    if (!this._callback) {
      this.emit('result', packet, this._index);
    } else {
      this._results.push(packet);
      this._fields.push(undefined);
    }
  } finally {
    this._index++;
    this._handleFinalResultPacket(packet);
  }
};

Query.prototype['ErrorPacket'] = function(packet) {
  var err = this._packetToError(packet);

  var results = (this._results.length > 0)
    ? this._results
    : undefined;

  var fields = (this._fields.length > 0)
    ? this._fields
    : undefined;

  err.index = this._index;
  this.end(err, results, fields);
};

Query.prototype['ResultSetHeaderPacket'] = function(packet) {
  this._resultSet = new ResultSet(packet);

  // used by LOAD DATA LOCAL INFILE queries
  if (packet.fieldCount === null) {
    this._sendLocalDataFile(packet.extra);
  }
};

Query.prototype['FieldPacket'] = function(packet) {
  this._resultSet.fieldPackets.push(packet);
};

Query.prototype['EofPacket'] = function(packet) {
  this._resultSet.eofPackets.push(packet);

  if (this._resultSet.eofPackets.length === 1 && !this._callback) {
    this.emit('fields', this._resultSet.fieldPackets, this._index);
  }

  if (this._resultSet.eofPackets.length !== 2) {
    return;
  }

  if (this._callback) {
    this._results.push(this._resultSet.rows);
    this._fields.push(this._resultSet.fieldPackets);
  }

  this._index++;
  this._resultSet = null;
  this._handleFinalResultPacket(packet);
};

Query.prototype._handleFinalResultPacket = function(packet) {
  if (packet.serverStatus & ServerStatus.SERVER_MORE_RESULTS_EXISTS) {
    return;
  }

  var results = (this._results.length > 1)
    ? this._results
    : this._results[0];

  var fields = (this._fields.length > 1)
    ? this._fields
    : this._fields[0];

  this.end(this._loadError, results, fields);
};

Query.prototype['RowDataPacket'] = function(packet, parser, connection) {
  packet.parse(parser, this._resultSet.fieldPackets, this.typeCast, this.nestTables, connection);

  if (this._callback) {
    this._resultSet.rows.push(packet);
  } else {
    this.emit('result', packet, this._index);
  }
};

Query.prototype._sendLocalDataFile = function(path) {
  var self = this;
  fs.readFile(path, 'utf-8', function(err, data) {
    if (err) {
      self._loadError = err;
    } else {
      self.emit('packet', new Packets.LocalDataFilePacket(data));
    }

    self.emit('packet', new Packets.EmptyPacket());
  });
};

Query.prototype.stream = function(options) {
  var self = this,
      stream;

  options = options || {};
  options.objectMode = true;
  stream = new Readable(options),

  stream._read = function() {
    self._connection.resume();
  };

  this.on('result',function(row,i) {
    if (!stream.push(row)) self._connection.pause();
    stream.emit('result',row,i);  // replicate old emitter
  });

  this.on('error',function(err) {
    stream.emit('error',err);  // Pass on any errors
  });

  this.on('end', function() {
    stream.push(null);  // pushing null, indicating EOF
  });

  this.on('fields',function(fields,i) {
    stream.emit('fields',fields,i);  // replicate old emitter
  });

  return stream;
};