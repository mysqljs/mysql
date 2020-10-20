module.exports = ComChangeUserPacket;

var ConnectionConfig = require('../../ConnectionConfig');
var Client = require('../constants/client');

function ComChangeUserPacket(options) {
  options = options || {};

  this.command       = 0x11;
  this.user          = options.user;
  this.scrambleBuff  = options.scrambleBuff;
  this.database      = options.database;
  this.charsetNumber = options.charsetNumber;
}

ComChangeUserPacket.prototype.parse = function(parser) {
  this.command       = parser.parseUnsignedNumber(1);
  this.user          = parser.parseNullTerminatedString();
  this.scrambleBuff  = parser.parseLengthCodedBuffer();
  this.database      = parser.parseNullTerminatedString();
  this.charsetNumber = parser.parseUnsignedNumber(1);
  let defaultFlags   = ConnectionConfig.getDefaultFlags();
  let mergedFlags    = ConnectionConfig.mergeFlags(defaultFlags);
  if(mergedFlags & Client.CLIENT_PLUGIN_AUTH != 0) {
    this.authPluginName = parser.parseNullTerminatedString();
  }
};

ComChangeUserPacket.prototype.write = function(writer) {
  writer.writeUnsignedNumber(1, this.command);
  writer.writeNullTerminatedString(this.user);
  writer.writeLengthCodedBuffer(this.scrambleBuff);
  writer.writeNullTerminatedString(this.database);
  writer.writeUnsignedNumber(2, this.charsetNumber);
  let defaultFlags = ConnectionConfig.getDefaultFlags();
  let mergedFlags = ConnectionConfig.mergeFlags(defaultFlags);
  if(mergedFlags & Client.CLIENT_PLUGIN_AUTH != 0) {
    writer.writeNullTerminatedString("mysql_native_password");
  }
};
