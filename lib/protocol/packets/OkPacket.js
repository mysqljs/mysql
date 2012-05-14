module.exports = OkPacket;
function OkPacket() {
  this.fieldCount   = undefined;
  this.affectedRows = undefined;
  this.insertId     = undefined;
  this.serverStatus = undefined;
  this.warningCount = undefined;
  this.message      = undefined;
}

OkPacket.prototype.parse = function(parser) {
  this.fieldCount   = parser.parseUnsignedNumber(1);
  this.affectedRows = parser.parseLengthCodedNumber();
  this.insertId     = parser.parseLengthCodedNumber();
  this.serverStatus = parser.parseUnsignedNumber(2);
  this.warningCount = parser.parseUnsignedNumber(2);
  this.message      = parser.parsePacketTerminatedString();
};

OkPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, 0x00);
  writer.writeLengthCodedNumber(this.affectedRows || 0);
  writer.writeLengthCodedNumber(this.insertId || 0);
  writer.writeUnsignedNumber(2, this.serverStatus || 0);
  writer.writeUnsignedNumber(2, this.warningCount || 0);
  writer.writeString(this.message);
};
