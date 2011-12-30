// "All numbers are stored with the least significant byte first.
// All numbers are unsigned."
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

module.exports = UnsignedNumber;
function UnsignedNumber(length, value) {
  this.length = length;
  this.value  = value;
}

UnsignedNumber.prototype.copy = function(buffer, offset) {
  var value = this.value;

  for (var i = 0; i < this.length; i++) {
    buffer[i + offset] = (value >> (i * 8)) & 0xff;
  }
};
