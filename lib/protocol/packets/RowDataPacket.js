/*
 * see http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Field_Packet
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = RowDataPacket;
Util.inherits(RowDataPacket, Packet);
function RowDataPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this.columns = {};

  if (properties.fieldPackets) {
    this._defineSchemaFromFieldPackets(properties.fieldPackets);
  }
}

RowDataPacket.prototype._defineSchemaFromFieldPackets = function(fieldPackets) {
  var self = this;

  this.push(fieldPackets.map(function(packet) {
    // @TODO Specify the actual encoding of this!
    return self.columns[packet.name.value] = new Elements.LengthCodedString('utf8');
  }));
};
