/*
 * COM_QUERY
 *
 * The most common request type. Used to execute nonprepared SQL statements.
 *
 *  Bytes                        Name
 *  -----                        ----
 *  n                            SQL statement
 *                               (up to end of packet, no termination character)
 *
 * -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#COM_QUERY
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = ComQueryPacket;
Util.inherits(ComQueryPacket, Packet);
function ComQueryPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this.command = new Elements.UnsignedNumber(1, 0x03);
  this.sql     = new Elements.PacketTerminatedString(properties.sql, 'utf-8');
}
