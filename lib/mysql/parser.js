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

Parser.prototype.write = function(b) {
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

  for (; i < b.length; i++) {
    var c = b[i];
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

        packet.type = Parser.GREETING_PACKET;
        advance(false, Parser.GREETING_PROTOCOL_VERSION);
        break;
      case Parser.GREETING_PROTOCOL_VERSION:
        // 1 byte
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

        packet.scrambleBuff = new Buffer(8 + 13);
        advance(true);
      case Parser.GREETING_SCRAMBLE_BUFF_1:
        // 8 bytes
        if (packet.index < 8) {
          packet.scrambleBuff[packet.index] = c;
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
        // 13 bytes
        packet.scrambleBuff[packet.index + 8] = c;

        if (packet.index == 12) {
          this.packet = null;
          this.state = Parser.IDLE;
          this.greeted = true;
          delete packet.index;
          this.emit('packet', packet);
        }
        break;
    }

    packet.index++;
    if (state > Parser.PACKET_NUMBER) {
      packet.received++;
    }
  }
};