/*
 * Result Set Header Packet
 *
 * From server to client after command, if no error and result set -- that is,
 * if the command was a query which returned a result set.  The Result Set
 * Header Packet is the first of several, possibly many, packets that the
 * server sends for result sets. The order of packets for a result set is:
 *
 *   (Result Set Header Packet)  the number of columns
 *   (Field Packets)             column descriptors
 *   (EOF Packet)                marker: end of Field Packets
 *   (Row Data Packets)          row contents
 *   (EOF Packet)                marker: end of Data Packets
 * Bytes                        Name
 *  -----                        ----
 *  1-9   (Length-Coded-Binary)  field_count
 *  1-9   (Length-Coded-Binary)  extra
 *
 *  field_count: See the section "Types Of Result Packets"
 *               to see how one can distinguish the
 *               first byte of field_count from the first
 *               byte of an OK Packet, or other packet types.
 *
 *  extra:       For example, SHOW COLUMNS uses this to send
 *               the number of rows in the table.
 *
 * The "extra" field is optional and never appears for ordinary result sets.
 * Alternative terms: a Result Set Packet is also called "a result packet for a
 * command returning rows" or "a field description packet".
 *
 * Relevant MySQL source code:
 *
 * libmysql/libmysql.c (client):
 *   mysql_store_result() Read a result set from the server to memory
 *   mysql_use_result()   Read a result set row by row from the server.
 *
 * See also my_net_write() which describes local data loading.
 *
 * Example of Result Set Header Packet
 *                     Hexadecimal                ASCII
 *                     -----------                -----
 * field_count         03                         .
 *
 * In the example, we se what the packet would contain after "SELECT * FROM t7" if table t7 has 3 columns.
 *
 * -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Result_Set_Header_Packet
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = ResultSetHeaderPacket;
Util.inherits(ResultSetHeaderPacket, Packet);
function ResultSetHeaderPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  this.push([
    this.fieldCount = new Elements.LengthCodedBinary(properties.fieldCount),
    this.extra      = new Elements.LengthCodedBinary(properties.extra),
  ]);
}
