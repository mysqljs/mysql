module.exports = ChangeUserPacket;
function ChangeUserPacket(options) {
  this.command = 0x11;
  options = options || {};

  this.user          = options.user;    
  this.scrambleBuff  = options.scrambleBuff;  
  this.database      = options.database;
  this.charsetNumber = options.charsetNumber;
}

ChangeUserPacket.prototype.parse = function(parser) {
  this.user          = parser.parseNullTerminatedString();
  this.scrambleBuff  = parser.parseLengthCodedBuffer();
  this.database      = parser.parseNullTerminatedString();  
  this.charsetNumber = parser.parseUnsignedNumber(1);    
};

ChangeUserPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeNullTerminatedString(this.user);
  writer.writeLengthCodedBuffer(this.scrambleBuff);
  writer.writeNullTerminatedString(this.database);
  writer.writeUnsignedNumber(1, this.charsetNumber);  
};