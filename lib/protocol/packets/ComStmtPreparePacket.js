var Commands = require('../commands/command_codes.js');

module.exports = ComStmtPreparePacket;
function ComStmtPreparePacket(sql) {
  this.command = Commands.PREPARE;
  this.sql     = sql;
}

ComStmtPreparePacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeString(this.sql);
};

ComStmtPreparePacket.prototype.parse = function(parser) {
  this.command = parser.parseUnsignedNumber(1);
  this.sql     = parser.parsePacketTerminatedString();
};