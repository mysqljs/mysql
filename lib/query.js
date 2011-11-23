var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Parser = require('./parser');
var Client;

function Query(properties) {
  EventEmitter.call(this);

  this.sql = null;
  this.typeCast = true;

  for (var key in properties) {
    this[key] = properties[key];
  }
};
util.inherits(Query, EventEmitter);
module.exports = Query;

function doTypeCast(text, fieldType) {
  switch (fieldType) {
    case Query.FIELD_TYPE_TIMESTAMP:
    case Query.FIELD_TYPE_DATE:
    case Query.FIELD_TYPE_DATETIME:
    case Query.FIELD_TYPE_NEWDATE:
      return new Date(text);
    case Query.FIELD_TYPE_TINY:
    case Query.FIELD_TYPE_SHORT:
    case Query.FIELD_TYPE_LONG:
    case Query.FIELD_TYPE_LONGLONG:
    case Query.FIELD_TYPE_INT24:
    case Query.FIELD_TYPE_YEAR:
      return parseInt(text, 10);
    case Query.FIELD_TYPE_FLOAT:
    case Query.FIELD_TYPE_DOUBLE:
      // decimal types cannot be parsed as floats because
      // V8 Numbers have less precision than some MySQL Decimals
      return parseFloat(text);
  }
  return text;
}

function coalesceBuffers(buffers) {
  var totalSize = 0;
  for(var i=0, c=buffers.length; i<c; i++) {
    totalSize += buffers[i].length;
  }
  var bigBuffer = new Buffer(totalSize);
  for(var i=0, c=buffers.length, curOffset=0; i<c; i++) {
    buffers[i].copy(bigBuffer, curOffset);
    curOffset += buffers[i].length;
  }
  return bigBuffer;
}

function fieldShouldBeReturnedAsBuffer(field) {
  var blob_or_text = 0 != (field.flags & Query.BLOB_FLAG);
  var binary = 0 != (field.flags & Query.BINARY_FLAG);
  return blob_or_text && binary;
}

Query.prototype._handlePacket = function(packet) {
  var self = this;

  // We can't do this require() on top of the file.
  // That's because there is circular dependency and we're overwriting
  // module.exports
  Client = Client || require('./client');

  switch (packet.type) {
    case Parser.OK_PACKET:
      this.emit('end', Client._packetToUserObject(packet));
      break;
    case Parser.ERROR_PACKET:
      packet.sql = this.sql;
      this.emit('error', Client._packetToUserObject(packet));
      break;
    case Parser.FIELD_PACKET:
      if (!this._fields) {
        this._fields = [];
      }

      this._fields.push(packet);
      this.emit('field', packet);
      break;
    case Parser.EOF_PACKET:
      if (!this._eofs) {
        this._eofs = 1;
      } else {
        this._eofs++;
      }

      if (this._eofs == 2) {
        this.emit('end');
      }
      break;
    case Parser.ROW_DATA_PACKET:
      var row = {};

      var rowIndex = 0;
      var cellBuffers = null;

      function finishCell() {
        var field = self._fields[rowIndex];
        if(!cellBuffers) {
          row[field.name] = null;
        } else {
          //coalesce collected buffers
          var cell = coalesceBuffers(cellBuffers);

          if(!fieldShouldBeReturnedAsBuffer(field)) {
            //if it's not a BLOB, convert to string and perhaps typecast
            cell = cell.toString('utf-8');
            if(self.typeCast) {
              cell = doTypeCast(cell, field.fieldType);
            }
          }
          row[field.name] = cell;
        }

        //prepare for next field
        ++rowIndex;
        cellBuffers = null;
        if (rowIndex == self._fields.length) {
           self.emit('row', row);
        }
      }

      packet.on('data', function(buffer, remaining) {
        if (buffer) {
          cellBuffers = cellBuffers || [];
          cellBuffers.push(buffer);
          if(remaining === 0) {
            finishCell();
          }
        } else {
          cellBuffers = null;
          finishCell();
        }

      });
      break;
  }
};

Query.FIELD_TYPE_DECIMAL     = 0x00;
Query.FIELD_TYPE_TINY        = 0x01;
Query.FIELD_TYPE_SHORT       = 0x02;
Query.FIELD_TYPE_LONG        = 0x03;
Query.FIELD_TYPE_FLOAT       = 0x04;
Query.FIELD_TYPE_DOUBLE      = 0x05;
Query.FIELD_TYPE_NULL        = 0x06;
Query.FIELD_TYPE_TIMESTAMP   = 0x07;
Query.FIELD_TYPE_LONGLONG    = 0x08;
Query.FIELD_TYPE_INT24       = 0x09;
Query.FIELD_TYPE_DATE        = 0x0a;
Query.FIELD_TYPE_TIME        = 0x0b;
Query.FIELD_TYPE_DATETIME    = 0x0c;
Query.FIELD_TYPE_YEAR        = 0x0d;
Query.FIELD_TYPE_NEWDATE     = 0x0e;
Query.FIELD_TYPE_VARCHAR     = 0x0f;
Query.FIELD_TYPE_BIT         = 0x10;
Query.FIELD_TYPE_NEWDECIMAL  = 0xf6;
Query.FIELD_TYPE_ENUM        = 0xf7;
Query.FIELD_TYPE_SET         = 0xf8;
Query.FIELD_TYPE_TINY_BLOB   = 0xf9;
Query.FIELD_TYPE_MEDIUM_BLOB = 0xfa;
Query.FIELD_TYPE_LONG_BLOB   = 0xfb;
Query.FIELD_TYPE_BLOB        = 0xfc;
Query.FIELD_TYPE_VAR_STRING  = 0xfd;
Query.FIELD_TYPE_STRING      = 0xfe;
Query.FIELD_TYPE_GEOMETRY    = 0xff;

Query.NOT_NULL_FLAG          = 0x0001;
Query.PRI_KEY_FLAG           = 0x0002;
Query.UNIQUE_KEY_FLAG        = 0x0004;
Query.MULTIPLE_KEY_FLAG      = 0x0008;
Query.BLOB_FLAG              = 0x0010;
Query.UNSIGNED_FLAG          = 0x0020;
Query.ZEROFILL_FLAG          = 0x0040;
Query.BINARY_FLAG            = 0x0080;
Query.ENUM_FLAG              = 0x0100;
Query.AUTO_INCREMENT_FLAG    = 0x0200;
Query.TIMESTAMP_FLAG         = 0x0400;
Query.SET_FLAG               = 0x0800;

