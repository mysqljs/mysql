var commands = require('../constants/commands');

module.exports = ComQuitPacket;
function ComQuitPacket(sql) {
  this.command = commands.COM_QUIT;
}

ComQuitPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
};

ComQuitPacket.prototype.parse = function(parser) {
  this.command = parser.parseUnsignedNumber(1);
};
