/*
 * From server to client in response to command, if error.
 * VERSION 4.0
 *  Bytes                       Name
 *  -----                       ----
 *  1                           field_count, always = 0xff
 *  2                           errno (little endian)
 *  n                           message
 *
 *  VERSION 4.1
 *  Bytes                       Name
 *  -----                       ----
 *  1                           field_count, always = 0xff
 *  2                           errno
 *  1                           (sqlstate marker), always '#'
 *  5                           sqlstate (5 characters)
 *  n                           message
 *
 *  field_count:       Always 0xff (255 decimal).
 *
 *  errno:             The possible values are listed in the manual, and in
 *                     the MySQL source code file /include/mysqld_error.h.
 *
 *  sqlstate marker:   This is always '#'. It is necessary for distinguishing
 *                     version-4.1 messages.
 *
 *  sqlstate:          The server translates errno values to sqlstate values
 *                     with a function named mysql_errno_to_sqlstate(). The
 *                     possible values are listed in the manual, and in the
 *                     MySQL source code file /include/sql_state.h.
 *
 *  message:           The error message is a string which ends at the end of
 *                     the packet, that is, its length can be determined from
 *                     the packet header. The MySQL client (in the my_net_read()
 *                     function) always adds '\0' to a packet, so the message
 *                     may appear to be a Null-Terminated String.
 *                     Expect the message to be between 0 and 512 bytes long.
 *
 * Alternative terms: field_count is also known as "Status code" or "Error Packet marker". errno is also known as "Error Number" or "Error Code".
 * Relevant files in MySQL source: (client) client.c net_safe_read() (server) sql/protocol.cc send_error()
 * Example of Error Packet
 *
 *                     Hexadecimal                ASCII
 *                     -----------                -----
 * field_count         ff                         .
 * errno               1b 04                      ..
 * (sqlstate marker)   23                         #
 * sqlstate            34 32 53 30 32             42S02
 * message             55 63 6b 6e 6f 77 6e 20    Unknown
 *                     74 61 62 6c 6c 65 20 27    table '
 *                     71 27                      q'
 *
 * Note that some error messages past MySQL 4.1 are still returned without SQLState. For example, error 1043 'Bad handshake'.
 *
 * http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Error_Packet
 */

var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

module.exports = ErrorPacket;
Util.inherits(ErrorPacket, Packet);
function ErrorPacket(properties) {
  properties = properties || {};
  Packet.call(this, properties);

  // Version 4.1
  this.push([
    this.fieldCount     = new Elements.UnsignedNumber(1, properties.fieldCount),
    this.errno          = new Elements.UnsignedNumber(2, properties.errno),
    this.sqlStateMarker = new Elements.FixedSizeString(1, properties.sqlStateMarker),
    this.sqlState       = new Elements.FixedSizeString(5, properties.sqlState),
    this.message        = new Elements.NullTerminatedString('utf-8', properties.message),
  ]);
}
