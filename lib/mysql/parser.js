if (global.GENTLY) require = GENTLY.hijack(require);

// see: http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol

var sys = require('sys'),
    Buffer = require('buffer').Buffer,
    EventEmitter = require('events').EventEmitter;

function Parser() {
  EventEmitter.call(this);

  this.state = Parser.PACKET_LENGTH;
  this.packet = null;
  this.greeted = false;
}
sys.inherits(Parser, EventEmitter);
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
        if (!('_lengthCodedLength' in packet)) {
          if (c === Parser.LENGTH_CODED_16BIT_WORD) {
            packet._lengthCodedLength = 2;
          } else if (c === Parser.LENGTH_CODED_24BIT_WORD) {
            packet._lengthCodedLength = 3;
          } else if (c === Parser.LENGTH_CODED_64BIT_WORD) {
            packet._lengthCodedLength = 8;
          } else if (c < Parser.LENGTH_CODED_NULL) {
            advance(nextState);
            return c;
          } else if (c === Parser.LENGTH_CODED_NULL) {
            advance(nextState);
            return null;
          }
          return 0;
        }

        val += Math.pow(256, packet.index - 1) * c;

        if (packet.index === packet._lengthCodedLength) {
          delete packet._lengthCodedLength;
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
      case Parser.PACKET_LENGTH:
        if (!packet) {
          packet = this.packet = new EventEmitter();
          packet.index = 0;
          packet.length = 0;
          packet.received = 0;
          packet.number = 0;
        }

          // 3 bytes - Little endian
        packet.length += Math.pow(256, packet.index) * c;

        if (packet.index == 2) {
          advance();
        }
        break;
      case Parser.PACKET_NUMBER:
        // 1 byte
        packet.number = c;

        if (!this.greeted) {
          advance(Parser.GREETING_PROTOCOL_VERSION);
          break;
        }

        advance(Parser.FIELD_COUNT);
        break;
      case Parser.GREETING_PROTOCOL_VERSION:
        // 1 byte
        packet.type = Parser.GREETING_PACKET;
        packet.protocolVersion = c;
        advance();
        break;
      case Parser.GREETING_SERVER_VERSION:
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
      case Parser.GREETING_THREAD_ID:
        if (packet.index == 0) {
          packet.threadId = 0;
        }

        // 4 bytes = probably Little endian, protocol docs are not clear
        packet.threadId += Math.pow(256, packet.index) * c;

        if (packet.index == 3) {
          advance();
        }
        break;
      case Parser.GREETING_SCRAMBLE_BUFF_1:
        if (packet.index == 0) {
          packet.scrambleBuffer = new Buffer(8 + 12);
        }

        // 8 bytes
        packet.scrambleBuffer[packet.index] = c;

        if (packet.index == 7) {
          advance();
        }
        break;
      case Parser.GREETING_FILLER_1:
        // 1 byte - 0x00
        advance()
        break;
      case Parser.GREETING_SERVER_CAPABILITIES:
        if (packet.index == 0) {
          packet.serverCapabilities = 0;
        }
        // 2 bytes = probably Little endian, protocol docs are not clear
        packet.serverCapabilities += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case Parser.GREETING_SERVER_LANGUAGE:
        packet.serverLanguage = c;
        advance();
        break;
      case Parser.GREETING_SERVER_STATUS:
        if (packet.index == 0) {
          packet.serverStatus = 0;
        }

        // 2 bytes = probably Little endian, protocol docs are not clear
        packet.serverStatus += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case Parser.GREETING_FILLER_2:
        // 13 bytes - 0x00
        if (packet.index == 12) {
          advance();
        }
        break;
      case Parser.GREETING_SCRAMBLE_BUFF_2:
        // 12 bytes - not 13 bytes like the protocol spec says ...
        if (packet.index < 12) {
          packet.scrambleBuffer[packet.index + 8] = c;
        }
        break;
      case Parser.FIELD_COUNT:
        if (packet.index == 0) {
          if (c === 0xff) {
            packet.type = Parser.ERROR_PACKET;
            advance(Parser.ERROR_NUMBER)
            break;
          }

          if (c === 0x00) {
            packet.type = Parser.OK_PACKET;
            advance(Parser.AFFECTED_ROWS)
            break;
          }
        }

        packet.type = Parser.RESULT_SET_HEADER_PACKET;
        packet.fieldCount = lengthCoded(packet.fieldCount, Parser.EXTRA);

        break;
      case Parser.ERROR_NUMBER:
        if (packet.index == 0) {
          packet.errorNumber = 0;
        }

        // 2 bytes = Little endian
        packet.errorNumber += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case Parser.ERROR_SQL_STATE_MARKER:
        // 1 character - always #
        packet.sqlStateMarker = String.fromCharCode(c);
        packet.sqlState = '';
        advance();
        break;
      case Parser.ERROR_SQL_STATE:
        // 5 characters
        if (packet.index < 5) {
          packet.sqlState += String.fromCharCode(c);
        }

        if (packet.index == 4) {
          advance(Parser.ERROR_MESSAGE);
        }
        break;
      case Parser.ERROR_MESSAGE:
        if (packet.received <= packet.length) {
          packet.errorMessage = (packet.errorMessage || '') + String.fromCharCode(c);
        }
        break;
      case Parser.AFFECTED_ROWS:
        packet.affectedRows = lengthCoded(packet.affectedRows);
        break;
      case Parser.INSERT_ID:
        packet.insertId = lengthCoded(packet.insertId);
        break;
      case Parser.SERVER_STATUS:
        if (packet.index == 0) {
          packet.serverStatus = 0;
        }

        // 2 bytes - Little endian
        packet.serverStatus += Math.pow(256, packet.index) * c;

        if (packet.index == 1) {
          advance();
        }
        break;
      case Parser.MESSAGE:
        if (packet.received <= packet.length) {
          packet.message = (packet.message || '') + String.fromCharCode(c);
        }
        break;
      case Parser.EXTRA:
        packet.extra = lengthCoded(packet.extra);
        break;
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
Parser.MESSAGE                      = s++;
Parser.EXTRA                        = s++;

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
