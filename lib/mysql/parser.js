if (global.GENTLY) require = GENTLY.hijack(require);

// see: http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol

var sys = require('sys')
  , Buffer = require('buffer').Buffer
  , EventEmitter = require('events').EventEmitter;

function Parser() {
  EventEmitter.call(this);

  this.state = Parser.IDLE;
  this.packet = null;
  this.greeted = false;
}
sys.inherits(Parser, EventEmitter);
module.exports = Parser;

// Parser states
var s                               = 0;
Parser.IDLE                         = s++;
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

Parser.prototype.write = function(buffer) {
  var i = 0
    , self = this
    , state = this.state
    , packet = this.packet
    , advance = function(noBreak, newState) {
        self.state = state = (newState === undefined)
          ? self.state + 1
          : newState;

        packet.index = (noBreak)
          ? 0
          : -1;
      };

  for (; i < buffer.length; i++) {
    var c = buffer[i];

    if (state > Parser.PACKET_NUMBER) {
      packet.received++;
    }

    switch (state) {
      case Parser.IDLE:
        packet = this.packet = new EventEmitter();
        packet.length = 0;
        packet.received = 0;
        packet.number = 0;

        advance(true);
      case Parser.PACKET_LENGTH:
          // 3 bytes - Little endian
        if (packet.index < 3) {
          packet.length += Math.pow(256, packet.index) * c;
          break;
        }

        advance(true);
      case Parser.PACKET_NUMBER:
        // 1 byte
        packet.number = c;

        if (!this.greeted) {
          advance(false, Parser.GREETING_PROTOCOL_VERSION);
          break;
        }

        advance(false, Parser.FIELD_COUNT);
        break;
      case Parser.GREETING_PROTOCOL_VERSION:
        // 1 byte
        packet.type = Parser.GREETING_PACKET;
        packet.protocolVersion = c;
        packet.serverVersion = '';
        advance();
        break;
      case Parser.GREETING_SERVER_VERSION:
          // Null-Terminated String
        if (c != 0) {
          packet.serverVersion += String.fromCharCode(c);
          break;
        }

        packet.threadId = 0;
        advance();
        break;
      case Parser.GREETING_THREAD_ID:
        // 4 bytes = probably Little endian, protocol docs are not clear
        if (packet.index < 4) {
          packet.threadId += Math.pow(256, packet.index) * c;
          break;
        }

        packet.scrambleBuffer = new Buffer(8 + 12);
        advance(true);
      case Parser.GREETING_SCRAMBLE_BUFF_1:
        // 8 bytes
        if (packet.index < 8) {
          packet.scrambleBuffer[packet.index] = c;
          break;
        }

        advance(true);
      case Parser.GREETING_FILLER_1:
        // 1 byte - 0x00
        packet.serverCapabilities = 0;
        advance()
        break;
      case Parser.GREETING_SERVER_CAPABILITIES:
        // 2 bytes = probably Little endian, protocol docs are not clear
        if (packet.index < 2) {
          packet.serverCapabilities += Math.pow(256, packet.index) * c;
          break;
        }

        advance(true);
      case Parser.GREETING_SERVER_LANGUAGE:
        packet.serverLanguage = c;
        packet.serverStatus = 0;
        advance();
        break;
      case Parser.GREETING_SERVER_STATUS:
        // 2 bytes = probably Little endian, protocol docs are not clear
        if (packet.index < 2) {
          packet.serverStatus += Math.pow(256, packet.index) * c;
          break;
        }

        advance(true);
      case Parser.GREETING_FILLER_2:
        // 13 bytes - 0x00
        if (packet.index < 13) {
          break;
        }

        advance(true);
      case Parser.GREETING_SCRAMBLE_BUFF_2:
        // 12 bytes - not 13 bytes like the protocol spec says ...
        if (packet.index < 12) {
          packet.scrambleBuffer[packet.index + 8] = c;
        }

        // last byte is 0, we just discard it and emit our packet
        if (packet.index == 12) {
          this.packet = null;
          this.state = state = Parser.IDLE;
          this.greeted = true;
          delete packet.index;
          this.emit('packet', packet);
        }
        break;
      case Parser.FIELD_COUNT:
        if (c === 0xff) {
          packet.errorNumber = 0;
          packet.type = Parser.ERROR_PACKET;
          advance(false, Parser.ERROR_NUMBER)
          break;
        }
        break;
      case Parser.ERROR_NUMBER:
        // 2 bytes = Little endian
        if (packet.index < 2) {
          packet.errorNumber += Math.pow(256, packet.index) * c;
          break;
        }

        advance(true);
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
          break;
        }

        packet.errorMessage = '';
        advance(true);
      case Parser.ERROR_MESSAGE:
        if (packet.received <= packet.length) {
          packet.errorMessage += String.fromCharCode(c);
        }

        if (packet.received == packet.length) {
          this.packet = null;
          this.state = Parser.IDLE;
          this.greeted = true;
          delete packet.index;
          this.emit('packet', packet);
        }
        break;
    }

    packet.index++;
  }
};