/*
 * see http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Field_Packet
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = FieldPacket;
Util.inherits(FieldPacket, Packet);
function FieldPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this.push([
    this.catalog   = new Elements.LengthCodedString('utf-8', properties.catalog),
    this.db        = new Elements.LengthCodedString('utf-8', properties.db),
    this.table     = new Elements.LengthCodedString('utf-8', properties.table),
    this.orgTable  = new Elements.LengthCodedString('utf-8', properties.orgTable),
    this.name      = new Elements.LengthCodedString('utf-8', properties.name),
    this.orgName   = new Elements.LengthCodedString('utf-8', properties.orgName),
    this.filler1   = new Elements.Filler(1),
    this.charsetNr = new Elements.UnsignedNumber(2, properties.charsetNr),
    // @TODO this is called 'length' in the mysql docs, maybe a reason to
    // move header into it's own thing.
    this.fieldLength = new Elements.UnsignedNumber(4, properties.fieldLength),
    this.type        = new Elements.UnsignedNumber(1, properties.type),
    this.flags       = new Elements.UnsignedNumber(2, properties.flags),
    this.decimals    = new Elements.UnsignedNumber(2, properties.decimals),
    this.filler2     = new Elements.Filler(2),
    this.default     = new Elements.LengthCodedString(properties.default),
  ]);
}
