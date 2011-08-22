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
      var row = this._row = {}, field;

      this._rowIndex = 0;

      packet.on('data', function(buffer, remaining) {
        if (!field) {
          field = self._fields[self._rowIndex];
          row[field.name] = '';
        }

        if (buffer) {
          row[field.name] += buffer.toString('utf-8');
        } else {
          row[field.name] = null;
        }

        if (remaining !== 0) {
          return;
        }

        self._rowIndex++;
        if (self.typeCast && buffer !== null) {
          switch (field.fieldType) {
            case Query.FIELD_TYPE_TIMESTAMP:
            case Query.FIELD_TYPE_DATE:
            case Query.FIELD_TYPE_DATETIME:
            case Query.FIELD_TYPE_NEWDATE:
              row[field.name] = new Date(row[field.name]);
              break;
            case Query.FIELD_TYPE_TINY:
            case Query.FIELD_TYPE_SHORT:
            case Query.FIELD_TYPE_LONG:
            case Query.FIELD_TYPE_LONGLONG:
            case Query.FIELD_TYPE_INT24:
            case Query.FIELD_TYPE_YEAR:
              row[field.name] = parseInt(row[field.name], 10);
              break;
            case Query.FIELD_TYPE_FLOAT:
            case Query.FIELD_TYPE_DOUBLE:
              // decimal types cannot be parsed as floats because
              // V8 Numbers have less precision than some MySQL Decimals
              row[field.name] = parseFloat(row[field.name]);
              break;
          }
        }

        if (self._rowIndex == self._fields.length) {
           delete self._row;
           delete self._rowIndex;
           self.emit('row', row);
           return;
        }

        field = null;
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
