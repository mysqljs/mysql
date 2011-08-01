if (global.GENTLY) require = GENTLY.hijack(require);

// see: http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol

var util = require('util'),
    Buffer = require('buffer').Buffer,
    EventEmitter = require('events').EventEmitter,
    POWS = [1, 256, 65536, 16777216];

function Parser() {
  EventEmitter.call(this);

  this.state = Parser.PACKET_LENGTH;
  this.packet = null;
  this.greeted = false;
  this.authenticated = false;
  this.receivingFieldPackets = false;
  this.receivingRowPackets = false;

  this._lengthCodedLength = null;
  this._lengthCodedStringLength = null;
};
util.inherits(Parser, EventEmitter);
module.exports = Parser;

Parser.prototype.write = function(buffer) {
  var i = 0,
      c = null,
      self = this,
      state = this.state,
      length = buffer.length,
      packet = this.packet,
      advance = function(newState) {
        self.state = state = (newState === undefined)
          ? self.state + 1
          : newState;

        packet.index = -1;
      },
      lengthCoded = function(val, nextState) {
        if (self._lengthCodedLength === null) {
          if (c === Parser.LENGTH_CODED_16BIT_WORD) {
            self._lengthCodedLength = 2;
          } else if (c === Parser.LENGTH_CODED_24BIT_WORD) {
            self._lengthCodedLength = 3;
          } else if (c === Parser.LENGTH_CODED_64BIT_WORD) {
            self._lengthCodedLength = 8;
          } else if (c === Parser.LENGTH_CODED_NULL) {
            advance(nextState);
            return null;
          } else if (c < Parser.LENGTH_CODED_NULL) {
            advance(nextState);
            return c;
          }

          return 0;
        }

        if (c) {
          val += POWS[packet.index - 1] * c;
        }

        if (packet.index === self._lengthCodedLength) {
          self._lengthCodedLength = null;
          advance(nextState);
        }

        return val;
      },
      emitPacket = function() {
        self.packet = null;
        self.state = state = Parser.PACKET_LENGTH;
        self.greeted = true;
        delete packet.index;
        self.emit('packet', packet);
        packet = null;
      };

  for (; i < length; i++) {
    c = buffer[i];

    if (state > Parser.PACKET_NUMBER) {
      packet.received++;
    }

    switch (state) {
      // PACKET HEADER
      case 0: // PACKET_LENGTH:
        if (!packet) {
          packet = this.packet = new EventEmitter();
          packet.index = 0;
          packet.length = 0;
          packet.received = 0;
          packet.number = 0;
        }

          // 3 bytes - Little endian
        packet.length += POWS[packet.index] * c;

        if (packet.index == 2) {
          advance();
        }
        break;
      case 1: // PACKET_NUMBER:
        // 1 byte
        packet.number = c;

        if (!this.greeted) {
          advance(Parser.GREETING_PROTOCOL_VERSION);
          break;
        }

        if (this.receivingFieldPackets) {
          advance(Parser.FIELD_CATALOG_LENGTH);
        } else if (this.receivingRowPackets) {
          advance(Parser.COLUMN_VALUE_LENGTH);
        } else {
          advance(Parser.FIELD_COUNT);
        }
        break;

      // GREETING_PACKET
      case 2: // GREETING_PROTOCOL_VERSION:
        // Nice undocumented MySql gem, the initial greeting can be an error
        // packet. Happens for too many connections errors.
        if (c === 0xff) {
          packet.type = Parser.ERROR_PACKET;
          advance(Parser.ERROR_NUMBER);
          break;
        }

        // 1 byte
        packet.type = Parser.GREETING_PACKET;
        packet.protocolVersion = c;
        advance();
        break;
      case 3: // GREETING_SERVER_VERSION:
        if (packet.index == 0) {
          packet.serverVersion = '';
        }

        // Null-Terminated String
        if (c != 0) {
          packet.serverVersion += String.fromCharCode(c);
        } else {
          advance();
        }
        break;
      case 4: // GREETING_THREAD_ID:
        if (packet.index == 0) {
          packet.threadId = 0;
        }

        // 4 bytes = probably Little endian, protocol docs are not clear
        packet.threadId += POWS[packet.index] * c;

        if (packet.index == 3) {
          advance();
        }
        break;
      case 5: // GREETING_SCRAMBLE_BUFF_1:
        if (packet.index == 0) {
          packet.scrambleBuffer = new Buffer(8 + 12);
        }

        // 8 bytes
        packet.scrambleBuffer[packet.index] = c;

        if (packet.index == 7) {
          advance();
        }
        break;
      case 6: // GREETING_FILLER_1:
        // 1 byte - 0x00
        advance();
        break;
      case 7: // GREETING_SERVER_CAPABILITIES:
        if (packet.index == 0) {
          packet.serverCapabilities = 0;
        }
        // 2 bytes = probably Little endian, protocol docs are not clear
        packet.serverCapabilities += POWS[packet.index] * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 8: // GREETING_SERVER_LANGUAGE:
        packet.serverLanguage = c;
        advance();
        break;
      case 9: // GREETING_SERVER_STATUS:
        if (packet.index == 0) {
          packet.serverStatus = 0;
        }

        // 2 bytes = probably Little endian, protocol docs are not clear
        packet.serverStatus += POWS[packet.index] * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 10: // GREETING_FILLER_2:
        // 13 bytes - 0x00
        if (packet.index == 12) {
          advance();
        }
        break;
      case 11: // GREETING_SCRAMBLE_BUFF_2:
        // 12 bytes - not 13 bytes like the protocol spec says ...
        if (packet.index < 12) {
          packet.scrambleBuffer[packet.index + 8] = c;
        }
        break;

      // OK_PACKET, ERROR_PACKET, or RESULT_SET_HEADER_PACKET
      case 12: // FIELD_COUNT:
        if (packet.index == 0) {
          if (c === 0xff) {
            packet.type = Parser.ERROR_PACKET;
            advance(Parser.ERROR_NUMBER);
            break;
          }

          if (c == 0xfe && !this.authenticated) {
            packet.type = Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET;
            break;
          }

          if (c === 0x00) {
            // after the first OK PACKET, we are authenticated
            this.authenticated = true;
            packet.type = Parser.OK_PACKET;
            advance(Parser.AFFECTED_ROWS);
            break;
          }
        }

        this.receivingFieldPackets = true;
        packet.type = Parser.RESULT_SET_HEADER_PACKET;
        packet.fieldCount = lengthCoded(packet.fieldCount, Parser.EXTRA_LENGTH);

        break;

      // ERROR_PACKET
      case 13: // ERROR_NUMBER:
        if (packet.index == 0) {
          packet.errorNumber = 0;
        }

        // 2 bytes = Little endian
        packet.errorNumber += POWS[packet.index] * c;

        if (packet.index == 1) {
          if (!this.greeted) {
            // Turns out error packets are confirming to the 4.0 protocol when
            // not greeted yet. Oh MySql, you are such a thing of beauty ...
            advance(Parser.ERROR_MESSAGE);
            break;
          }

          advance();
        }
        break;
      case 14: // ERROR_SQL_STATE_MARKER:
        // 1 character - always #
        packet.sqlStateMarker = String.fromCharCode(c);
        packet.sqlState = '';
        advance();
        break;
      case 15: // ERROR_SQL_STATE:
        // 5 characters
        if (packet.index < 5) {
          packet.sqlState += String.fromCharCode(c);
        }

        if (packet.index == 4) {
          advance(Parser.ERROR_MESSAGE);
        }
        break;
      case 16: // ERROR_MESSAGE:
        if (packet.received <= packet.length) {
          packet.errorMessage = (packet.errorMessage || '') + String.fromCharCode(c);
        }
        break;

      // OK_PACKET
      case 17: // AFFECTED_ROWS:
        packet.affectedRows = lengthCoded(packet.affectedRows);
        break;
      case 18: // INSERT_ID:
        packet.insertId = lengthCoded(packet.insertId);
        break;
      case 19: // SERVER_STATUS:
        if (packet.index == 0) {
          packet.serverStatus = 0;
        }

        // 2 bytes - Little endian
        packet.serverStatus += POWS[packet.index] * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 20: // WARNING_COUNT:
        if (packet.index == 0) {
          packet.warningCount = 0;
        }

        // 2 bytes - Little endian
        packet.warningCount += POWS[packet.index] * c;

        if (packet.index == 1) {
          packet.message = '';
          advance();
        }
        break;
      case 21: // MESSAGE:
        if (packet.received <= packet.length) {
          packet.message += String.fromCharCode(c);
        }
        break;

      // RESULT_SET_HEADER_PACKET
      case 22: // EXTRA_LENGTH:
        packet.extra = '';
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        break;
      case 23: // EXTRA_STRING:
        packet.extra += String.fromCharCode(c);
        break;

      // FIELD_PACKET or EOF_PACKET
      case 24: // FIELD_CATALOG_LENGTH:
        if (packet.index == 0) {
          if (c === 0xfe) {
            packet.type = Parser.EOF_PACKET;
            advance(Parser.EOF_WARNING_COUNT);
            break;
          }
          packet.type = Parser.FIELD_PACKET;
        }
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        break;
      case 25: // FIELD_CATALOG_STRING:
        if (packet.index == 0) {
          packet.catalog = '';
        }
        packet.catalog += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 26: // FIELD_DB_LENGTH:
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        if (self._lengthCodedStringLength == 0) {
          advance();
        }
        break;
      case 27: // FIELD_DB_STRING:
        if (packet.index == 0) {
          packet.db = '';
        }
        packet.db += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 28: // FIELD_TABLE_LENGTH:
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        if (self._lengthCodedStringLength == 0) {
          advance();
        }
        break;
      case 29: // FIELD_TABLE_STRING:
        if (packet.index == 0) {
          packet.table = '';
        }
        packet.table += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 30: // FIELD_ORIGINAL_TABLE_LENGTH:
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        if (self._lengthCodedStringLength == 0) {
          advance();
        }
        break;
      case 31: // FIELD_ORIGINAL_TABLE_STRING:
        if (packet.index == 0) {
          packet.originalTable = '';
        }
        packet.originalTable += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 32: // FIELD_NAME_LENGTH:
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        break;
      case 33: // FIELD_NAME_STRING:
        if (packet.index == 0) {
          packet.name = '';
        }
        packet.name += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 34: // FIELD_ORIGINAL_NAME_LENGTH:
        self._lengthCodedStringLength = lengthCoded(self._lengthCodedStringLength);
        if (self._lengthCodedStringLength == 0) {
          advance();
        }
        break;
      case 35: // FIELD_ORIGINAL_NAME_STRING:
        if (packet.index == 0) {
          packet.originalName = '';
        }
        packet.originalName += String.fromCharCode(c);

        if (packet.index + 1 === self._lengthCodedStringLength) {
          advance();
        }
        break;
      case 36: // FIELD_FILLER_1:
        // 1 bytes - 0x00
        advance();
        break;
      case 37: // FIELD_CHARSET_NR:
        if (packet.index == 0) {
          packet.charsetNumber = 0;
        }

        // 2 bytes - Little endian
        packet.charsetNumber += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 38: // FIELD_LENGTH:
        if (packet.index == 0) {
          packet.fieldLength = 0;
        }

        // 4 bytes - Little endian
        packet.fieldLength += Math.pow(256, packet.index) * c;

        if (packet.index == 3) {
          advance();
        }
        break;
      case 39: // FIELD_TYPE:
        // 1 byte
        packet.fieldType = c;
        advance();
      case 40: // FIELD_FLAGS:
        if (packet.index == 0) {
          packet.flags = 0;
        }

        // 2 bytes - Little endian
        packet.flags += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 41: // FIELD_DECIMALS:
        // 1 byte
        packet.decimals = c;
        advance();
        break;
      case 42: // FIELD_FILLER_2:
        // 2 bytes - 0x00
        if (packet.index == 1) {
          advance();
        }
        break;
      case 43: // FIELD_DEFAULT:
        // TODO: Only occurs for mysql_list_fields()
        break;

      // EOF_PACKET
      case 44: // EOF_WARNING_COUNT:
        if (packet.index == 0) {
          packet.warningCount = 0;
        }

        // 2 bytes - Little endian
        packet.warningCount += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case 45: // EOF_SERVER_STATUS:
        if (packet.index == 0) {
          packet.serverStatus = 0;
        }

        // 2 bytes - Little endian
        packet.serverStatus += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          if (this.receivingFieldPackets) {
            this.receivingFieldPackets = false;
            this.receivingRowPackets = true;
          } else {
          }
        }
        break;
      case 46: // COLUMN_VALUE_LENGTH:
        if (packet.index == 0) {
          packet.columnLength = 0;
          packet.type = Parser.ROW_DATA_PACKET;
        }

        if (packet.received == 1) {
          if (c === 0xfe) {
            packet.type = Parser.EOF_PACKET;
            this.receivingRowPackets = false;
            advance(Parser.EOF_WARNING_COUNT);
            break;
          }
          this.emit('packet', packet);
        }

        packet.columnLength = lengthCoded(packet.columnLength);

        if (!packet.columnLength && !this._lengthCodedLength) {
          packet.emit('data', (packet.columnLength === null ? null : new Buffer(0)), 0);
          if (packet.received < packet.length) {
            advance(Parser.COLUMN_VALUE_LENGTH);
          } else {
            self.packet = packet = null;
            self.state = state = Parser.PACKET_LENGTH;
            continue;
          }
        }
        break;
      case 47: // COLUMN_VALUE_STRING:
        var remaining = packet.columnLength - packet.index, read;
        if (i + remaining > buffer.length) {
          read = buffer.length - i;
          packet.index += read;
          packet.emit('data', buffer.slice(i, buffer.length), remaining - read);
          // the -1 offsets are because these values are also manipulated by the loop itself
          packet.received += read - 1;
          i = buffer.length;
        } else {
          packet.emit('data', buffer.slice(i, i + remaining), 0);
          i += remaining - 1;
          packet.received += remaining - 1;
          advance(Parser.COLUMN_VALUE_LENGTH);
          // advance() sets this to -1, but packet.index++ is skipped, so we need to manually fix
          packet.index = 0;
        }

        if (packet.received == packet.length) {
          self.packet = packet = null;
          self.state = state = Parser.PACKET_LENGTH;
        }

        continue;
    }

    packet.index++;

    if (state > Parser.PACKET_NUMBER && packet.received === packet.length) {
      emitPacket();
    }
  }
};


Parser.LENGTH_CODED_NULL = 251;
Parser.LENGTH_CODED_16BIT_WORD= 252;
Parser.LENGTH_CODED_24BIT_WORD= 253;
Parser.LENGTH_CODED_64BIT_WORD= 254;

// Parser states
var s                               = 0;
Parser.PACKET_LENGTH                = s++;
Parser.PACKET_NUMBER                = s++;
Parser.GREETING_PROTOCOL_VERSION    = s++;
Parser.GREETING_SERVER_VERSION      = s++;
Parser.GREETING_THREAD_ID           = s++;
Parser.GREETING_SCRAMBLE_BUFF_1     = s++;
Parser.GREETING_FILLER_1            = s++;
Parser.GREETING_SERVER_CAPABILITIES = s++;
Parser.GREETING_SERVER_LANGUAGE     = s++;
Parser.GREETING_SERVER_STATUS       = s++;
Parser.GREETING_FILLER_2            = s++;
Parser.GREETING_SCRAMBLE_BUFF_2     = s++;
Parser.FIELD_COUNT                  = s++;
Parser.ERROR_NUMBER                 = s++;
Parser.ERROR_SQL_STATE_MARKER       = s++;
Parser.ERROR_SQL_STATE              = s++;
Parser.ERROR_MESSAGE                = s++;
Parser.AFFECTED_ROWS                = s++;
Parser.INSERT_ID                    = s++;
Parser.SERVER_STATUS                = s++;
Parser.WARNING_COUNT                = s++;
Parser.MESSAGE                      = s++;
Parser.EXTRA_LENGTH                 = s++;
Parser.EXTRA_STRING                 = s++;
Parser.FIELD_CATALOG_LENGTH         = s++;
Parser.FIELD_CATALOG_STRING         = s++;
Parser.FIELD_DB_LENGTH              = s++;
Parser.FIELD_DB_STRING              = s++;
Parser.FIELD_TABLE_LENGTH           = s++;
Parser.FIELD_TABLE_STRING           = s++;
Parser.FIELD_ORIGINAL_TABLE_LENGTH  = s++;
Parser.FIELD_ORIGINAL_TABLE_STRING  = s++;
Parser.FIELD_NAME_LENGTH            = s++;
Parser.FIELD_NAME_STRING            = s++;
Parser.FIELD_ORIGINAL_NAME_LENGTH   = s++;
Parser.FIELD_ORIGINAL_NAME_STRING   = s++;
Parser.FIELD_FILLER_1               = s++;
Parser.FIELD_CHARSET_NR             = s++;
Parser.FIELD_LENGTH                 = s++;
Parser.FIELD_TYPE                   = s++;
Parser.FIELD_FLAGS                  = s++;
Parser.FIELD_DECIMALS               = s++;
Parser.FIELD_FILLER_2               = s++;
Parser.FIELD_DEFAULT                = s++;
Parser.EOF_WARNING_COUNT            = s++;
Parser.EOF_SERVER_STATUS            = s++;
Parser.COLUMN_VALUE_LENGTH          = s++;
Parser.COLUMN_VALUE_STRING          = s++;

// Packet types
var p                                   = 0;
Parser.GREETING_PACKET                  = p++;
Parser.OK_PACKET                        = p++;
Parser.ERROR_PACKET                     = p++;
Parser.RESULT_SET_HEADER_PACKET         = p++;
Parser.FIELD_PACKET                     = p++;
Parser.EOF_PACKET                       = p++;
Parser.ROW_DATA_PACKET                  = p++;
Parser.ROW_DATA_BINARY_PACKET           = p++;
Parser.OK_FOR_PREPARED_STATEMENT_PACKET = p++;
Parser.PARAMETER_PACKET                 = p++;
Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET = p++;
