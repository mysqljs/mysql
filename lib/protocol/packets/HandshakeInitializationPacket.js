var Packet   = require('./Packet');
var Util     = require('util');
var Elements = require('../elements');

/*
 * From server to client during initial handshake. The follow is taken from sql/sql_acl.cc:
 *
 *Bytes                        Name
 * -----                        ----
 * 1                            protocol_version
 * n (Null-Terminated String)   server_version
 * 4                            thread_id
 * 8                            scramble_buff
 * 1                            (filler) always 0x00
 * 2                            server_capabilities
 * 1                            server_language
 * 2                            server_status
 * 2                            server capabilities (two upper bytes)
 * 1                            length of the scramble
 *10                            (filler)  always 0
 * n                            rest of the plugin provided data (at least 12 bytes)
 * 1                            \0 byte, terminating the second part of a scramble
 *
 * protocol_version:    The server takes this from PROTOCOL_VERSION
 *                      in /include/mysql_version.h. Example value = 10.
 *
 * server_version:      The server takes this from MYSQL_SERVER_VERSION
 *                      in /include/mysql_version.h. Example value = "4.1.1-alpha".
 *
 * thread_number:       ID of the server thread for this connection.
 *
 * scramble_buff:       The password mechanism uses this. The second part are the
 *                      last 13 bytes.
 *                      (See "Password functions" section elsewhere in this document.)
 *
 * server_capabilities: CLIENT_XXX options. The possible flag values at time of
 * writing (taken from  include/mysql_com.h):
 *  CLIENT_LONG_PASSWORD	1	[> new more secure passwords <]
 *  CLIENT_FOUND_ROWS	2	[> Found instead of affected rows <]
 *  CLIENT_LONG_FLAG	4	[> Get all column flags <]
 *  CLIENT_CONNECT_WITH_DB	8	[> One can specify db on connect <]
 *  CLIENT_NO_SCHEMA	16	[> Don't allow database.table.column <]
 *  CLIENT_COMPRESS		32	[> Can use compression protocol <]
 *  CLIENT_ODBC		64	[> Odbc client <]
 *  CLIENT_LOCAL_FILES	128	[> Can use LOAD DATA LOCAL <]
 *  CLIENT_IGNORE_SPACE	256	[> Ignore spaces before '(' <]
 *  CLIENT_PROTOCOL_41	512	[> New 4.1 protocol <]
 *  CLIENT_INTERACTIVE	1024	[> This is an interactive client <]
 *  CLIENT_SSL              2048	[> Switch to SSL after handshake <]
 *  CLIENT_IGNORE_SIGPIPE   4096    [> IGNORE sigpipes <]
 *  CLIENT_TRANSACTIONS	8192	[> Client knows about transactions <]
 *  CLIENT_RESERVED         16384   [> Old flag for 4.1 protocol  <]
 *  CLIENT_SECURE_CONNECTION 32768  [> New 4.1 authentication <]
 *  CLIENT_MULTI_STATEMENTS 65536   [> Enable/disable multi-stmt support <]
 *  CLIENT_MULTI_RESULTS    131072  [> Enable/disable multi-results <]
 *
 * server_language:     current server character set number
 *
 * server_status:       SERVER_STATUS_xxx flags: e.g. SERVER_STATUS_AUTOCOMMIT
 *
 * Alternative terms: Handshake Initialization Packet is also called
 * "greeting packet". Protocol version is also called "Prot. version".
 * server_version is also called "Server Version String". thread_number is also
 * called "Thread Number". current server charset number is also called
 * "charset_no". scramble_buff is also called "crypt seed". server_status is
 * also called "SERVER_STATUS_xxx flags" or "Server status variables".
 *
 * http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Handshake_Initialization_Packet
 */

module.exports = HandshakeInitializationPacket;
Util.inherits(HandshakeInitializationPacket, Packet);
function HandshakeInitializationPacket(properties) {
  properties = properties || {};

  Packet.call(this, properties);

  this.protocolVersion     = new Elements.UnsignedNumber(1, properties.protocolVersion);
  this.serverVersion       = new Elements.NullTerminatedString('utf-8', properties.serverVersion);
  this.threadId            = new Elements.UnsignedNumber(4, properties.threadId);
  this.scrambleBuff1       = new Elements.FixedSizeString(8, properties.scrambleBuff1);
  this.filler1             = new Elements.Filler(1);
  this.serverCapabilities1 = new Elements.UnsignedNumber(2, properties.serverCapabilities1);
  this.serverLanguage      = new Elements.UnsignedNumber(1, properties.serverLanguage);
  this.serverStatus        = new Elements.UnsignedNumber(2, properties.serverStatus);
  this.serverCapabilities2 = new Elements.UnsignedNumber(2, properties.serverCapabilities2);
  this.scrambleLength      = new Elements.UnsignedNumber(1, properties.scrambleLength);
  this.filler2             = new Elements.Filler(10);
  this.scrambleBuff2       = new Elements.NullTerminatedString(null, properties.scrambleBuff2);
  // Could not find this clearly documented in the protocol docs, sample value: 'mysql_native_password'
  this.pluginData          = new Elements.NullTerminatedString('utf-8', properties.pluginData);
}
