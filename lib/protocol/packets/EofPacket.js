/*
 * see http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#EOF_Packet
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = EofPacket;
Util.inherits(EofPacket, Packet);
function EofPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  // Version 4.1
  this.push([
    this.fieldCount   = new Elements.UnsignedNumber(1, properties.fieldCount),
    this.warningCount = new Elements.UnsignedNumber(2, properties.warningCount),
    this.statusFlags  = new Elements.UnsignedNumber(2, properties.statusFlags),
  ]);
}
