// "Null-Terminated String: used for some variable-length character strings.
// The value '\0' (sometimes written 0x00) denotes the end of the string."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = NullTerminatedString;
function NullTerminatedString(string) {
  this.string = string;
  this.length = Buffer.byteLength(string, 'utf-8');
}

NullTerminatedString.prototype.copy = function(buffer, offset) {
  buffer.write(this.string, offset, 'utf-8');
};
