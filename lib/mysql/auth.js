var Buffer = require('buffer').Buffer,
    crypto = require('crypto');

function sha1(msg) {
  var hash = crypto.createHash('sha1');
  hash.update(msg);
  // hash.digest() does not output buffers yet
  return hash.digest('binary');
};
exports.sha1 = sha1;

function xor(a, b) {
  a = new Buffer(a, 'binary');
  b = new Buffer(b, 'binary');
  var result = new Buffer(a.length);
  for (var i = 0; i < a.length; i++) {
    result[i] = (a[i] ^ b[i]);
  }
  return result;
};
exports.xor = xor;

exports.token = function(password, scramble) {
  if (!password) {
    return new Buffer(0);
  }

  var stage1 = sha1(password);
  var stage2 = sha1(stage1);
  var stage3 = sha1(scramble.toString('binary') + stage2);
  return xor(stage3, stage1);
};

// This is a port of sql/password.c:hash_password which needs to be used for
// pre-4.1 passwords.
exports.hashPassword = function(password) {
  var nr = 1345345333,
      add = 7,
      nr2 = 0x12345671,
      result = new Buffer(8);

  password = new Buffer(password);
  for (var i = 0; i < password.length; i++) {
    var c = password[i];
    if (c == 32 || c == 9) {
      // skip space in password
      continue;
    }

    nr ^= this.multiply(((nr & 63) + add), c) + (nr << 8);
    nr2 += (nr2 << 8) ^ nr;
    add += c;
  }

  this.int32Write(result, nr & ((1 << 31) - 1), 0);
  this.int32Write(result, nr2 & ((1 << 31) - 1), 4);

  return result;
}

// Provided by Herbert Vojčík, needed to deal with float point precision problems in JS
exports.multiply = function(a, b) {
  var a1 = a >>> 16,
      a2 = a & 0xffff;
  // Precondition: b is in 32bit range

  return ((a1 * b << 16) + a2 * b) >>> 0;
}

exports.int32Write = function(buffer, number, offset) {
  var unsigned = (number < 0) ? (number + 0x100000000) : number;
  buffer[offset] = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  buffer[offset + 1] = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  buffer[offset + 2] = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  buffer[offset + 3] = Math.floor(unsigned);
};

