// "Length Coded Binary: a variable-length number. To compute the value of a
// Length Coded Binary, one must examine the value of its first byte."
//
// Value Of     # Of Bytes  Description
// First Byte   Following
// ----------   ----------- -----------
// 0-250        0           = value of first byte
// 251          0           column value = NULL
//                          only appropriate in a Row Data Packet
// 252          2           = value of following 16-bit word
// 253          3           = value of following 24-bit word
// 254          8           = value of following 64-bit word
//
// -- http://forge.mysql.com/wiki/MySQL_Internals_ClientServer_Protocol#Elements

var BIT_16 = Math.pow(2, 16);
var BIT_24 = Math.pow(2, 24);

// The maximum precision JS Numbers can hold precisely
// Don't panic: Good enough for values up to 8192 TB
var IEEE_754_BINARY_64_PRECISION = Math.pow(2, 53);

module.exports = LengthCodedBinary;
function LengthCodedBinary(value) {
  this.value  = value;
  this.length = LengthCodedBinary.byteLength(value);
}

LengthCodedBinary.byteLength = function(value) {
  if (value === null || value <= 250) return 1;
  if (value <= BIT_16) return 3;
  if (value <= BIT_24) return 4;
  if (value < IEEE_754_BINARY_64_PRECISION) return 9;

  throw new Error(
    'LengthCodedBinary.SizeExceeded: JS precision range exceeded, your ' +
    'number is > 53 bit: "' + value + '"'
  );
};

LengthCodedBinary.prototype.copy = function(buffer, offset) {
  // Optimization: Reduce property lookups
  var value = this.value;

  if (value === null) return buffer[offset] = 251;
  if (value <= 250) return buffer[offset] = value;

  // Optimization: Reduce property lookups
  var length = this.length;

  // 16 Bit
  buffer[offset + 1] = value & 0xff;
  buffer[offset + 2] = (value >> 8) & 0xff;

  if (length === 3) {
    // 16 Bit Marker
    buffer[offset + 0] = 252;
    return;
  }

  // 24 Bit
  buffer[offset + 3] = (value >> 16) & 0xff;

  if (length === 4) {
    // 24 Bit Marker
    buffer[offset + 0] = 253;
    return;
  }

  if (length === 9) {
    // 64 Bit Marker
    buffer[offset + 0] = 254;

    buffer[offset + 4] = (value >> 24) & 0xff;

    // Hack: Get the most significant 32 bit (JS bitwise operators are 32 bit)
    value = value.toString(2);
    value = value.substr(0, value.length - 32);
    value = parseInt(value, 2);

    buffer[offset + 5] = value & 0xff;
    buffer[offset + 6] = (value >> 8) & 0xff;
    // This only works for values up to 53 bit, see constructor check
    buffer[offset + 7] = (value >> 16) & 0xff;
    // No point in setting byte #8, as we're capped to 53 bit
    return;
  }
};
