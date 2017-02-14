var Sequence     = require('./Sequence');
var Util         = require('util');
var Packets      = require('../packets');
var ResultSet    = require('../ResultSet');
var ServerStatus = require('../constants/server_status');
var fs           = require('fs');
var Readable     = require('readable-stream');

module.exports = Query;
Util.inherits(Query, Sequence);
function Query(options, callback) {
  Sequence.call(this, options, callback);

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
  this._saveQueryTime('request');
  this.emit('packet', new Packets.ComQueryPacket(this.sql));
};

Query.prototype.determinePacket = function determinePacket(byte, parser) {
  var resultSet = this._resultSet;

  if (!resultSet) {
    switch (byte) {
      case 0x00: return Packets.OkPacket;
      case 0xff: return Packets.ErrorPacket;
      default:   return Packets.ResultSetHeaderPacket;
    }
  }

  if (resultSet.eofPackets.length === 0) {
    return (resultSet.fieldPackets.length < resultSet.resultSetHeaderPacket.fieldCount)
      ? Packets.FieldPacket
      : Packets.EofPacket;
  }

  if (byte === 0xff) {
    return Packets.ErrorPacket;
  }

  if (byte === 0xfe && parser.packetLength() < 9) {
    return Packets.EofPacket;
  }

  return Packets.RowDataPacket;
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
    this._resultSet = null;
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
  this._saveQueryTime('first_response');

  if (packet.fieldCount === null) {
    this._sendLocalDataFile(packet.extra);
  } else {
    this._resultSet = new ResultSet(packet);
  }
};

Query.prototype['FieldPacket'] = function(packet) {
  this._resultSet.fieldPackets.push(packet);
};

Query.prototype['EofPacket'] = function(packet) {
  this._resultSet.eofPackets.push(packet);

  if (this._resultSet.eofPackets.length === 1) {
    this._saveQueryTime('fields');

    if (!this._callback) {
      this.emit('fields', this._resultSet.fieldPackets, this._index);
    }
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

  this._saveQueryTime('end');

  var results = (this._results.length > 1)
    ? this._results
    : this._results[0];

  var fields = (this._fields.length > 1)
    ? this._fields
    : this._fields[0];

  this.end(this._loadError, results, fields);
};

Query.prototype['RowDataPacket'] = function(packet, parser, connection) {
  if (typeof this._hasRows === 'undefined') {
    this._saveQueryTime('first_row');
    this._hasRows = true;
  }

  packet.parse(parser, this._resultSet.fieldPackets, this.typeCast, this.nestTables, connection);

  if (this._callback) {
    this._resultSet.rows.push(packet);
  } else {
    this.emit('result', packet, this._index);
  }
};

Query.prototype._sendLocalDataFile = function(path) {
  var self = this;
  var localStream = fs.createReadStream(path, {
    flag      : 'r',
    encoding  : null,
    autoClose : true
  });

  this.on('pause', function () {
    localStream.pause();
  });

  this.on('resume', function () {
    localStream.resume();
  });

  localStream.on('data', function (data) {
    self.emit('packet', new Packets.LocalDataFilePacket(data));
  });

  localStream.on('error', function (err) {
    self._loadError = err;
    localStream.emit('end');
  });

  localStream.on('end', function () {
    self.emit('packet', new Packets.EmptyPacket());
  });
};

Query.prototype.stream = function(options) {
  var self = this,
      stream;

  options = options || {};
  options.objectMode = true;
  stream = new Readable(options);

  stream._read = function() {
    self._connection && self._connection.resume();
  };

  stream.once('end', function() {
    process.nextTick(function () {
      stream.emit('close');
    });
  });

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

Query.prototype._saveQueryTime = function(tag) {
  if (this._connection.isQueryTimeProfilingMode()) {
    if (typeof this._queryTimeTimeline === 'undefined') {
      this._queryTimeTimeline = {};
    }

    this._queryTimeTimeline[tag] = typeof process.hrtime === 'undefined' ? Date.now() : process.hrtime();

    if (tag === 'end') {
      this._queryTimeProfilingData = {
        sql      : this.sql,
        timeline : {
          first_byte : this._getQueryTimeDiff(this._queryTimeTimeline.first_response, this._queryTimeTimeline.request),
          fields     : this._getQueryTimeDiff(this._queryTimeTimeline.fields, this._queryTimeTimeline.first_response),
          first_row  : this._getQueryTimeDiff(this._queryTimeTimeline.first_row, this._queryTimeTimeline.fields),
          last_row   : this._getQueryTimeDiff(this._queryTimeTimeline.end, this._queryTimeTimeline.first_row)
        }
      };

      var timeline = this._queryTimeProfilingData.timeline;
      this._queryTimeProfilingData.total_time = (timeline.first_byte + timeline.fields + timeline.first_row + timeline.last_row).toFixed(9);

      delete this._queryTimeTimeline;

      this._connection.emit('queryTimeProfiling', this);
    }
  }
};

Query.prototype._getQueryTimeDiff = function(endTime, startTime) {
  if (Array.isArray(endTime)) {
    return (endTime[0] - startTime[0]) + (endTime[1] - startTime[1]) / 1e9;
  } else {
    return (endTime - startTime) / 1000;
  }
};

Query.prototype.getQueryTimeProfiling = function() {
  return this._queryTimeProfilingData;
};

Query.prototype.printQueryTimeProfiling = function() {
  var data = this.getQueryTimeProfiling();
  if (data === null) {
    console.log("[!] There's no time information for this query.");
    return;
  }

  console.log('===============================================================================');
  console.log(data.sql);
  console.log('-------------------------------------------------------------------------------');
  console.log('- first_byte : %d sec.', data.timeline.first_byte);
  console.log('- fields     : %d sec.', data.timeline.fields);
  console.log('- first_row  : %d sec.', data.timeline.first_row);
  console.log('- last_row   : %d sec.', data.timeline.last_row);
  console.log();
  console.log('# total time : %d sec.', data.total_time);
  console.log('===============================================================================');
  console.log();
};
