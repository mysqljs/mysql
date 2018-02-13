module.exports = ComInitDbPacket;
function ComInitDbPacket(database_name) {
  this.command = 0x02;
  this.database_name     = database_name;
}

ComInitDbPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeString(this.database_name);
};

ComInitDbPacket.prototype.parse = function(parser) {
  this.command = parser.parseUnsignedNumber(1);
  this.database_name     = parser.parsePacketTerminatedString();
};
