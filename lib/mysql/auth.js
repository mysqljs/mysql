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

	var nr = [0x5030, 0x5735];
	var add = 7;
	var nr2 = [0x1234, 0x5671];
	var result = new Buffer(8);

	if (typeof password == 'string'){
		password = new Buffer(password);
	}

	for (var i = 0; i < password.length; i++) {
		var c = password[i];
		if (c == 32 || c == 9) {
			// skip space in password
			continue;
		}

		// nr^= (((nr & 63)+add)*c)+ (nr << 8);
		// nr = xor(nr, add(mul(add(and(nr, 63), add), c), shl(nr, 8)))
		nr = this.xor32(nr, this.add32(this.mul32(this.add32(this.and32(nr, [0,63]), [0,add]), [0,c]), this.shl32(nr, 8)));

		// nr2+=(nr2 << 8) ^ nr;
		// nr2 = add(nr2, xor(shl(nr2, 8), nr))
		nr2 = this.add32(nr2, this.xor32(this.shl32(nr2, 8), nr));

		// add+=tmp;
		add += c;
	}

	this.int31Write(result, nr, 0);
	this.int31Write(result, nr2, 4);

	return result;
};

exports.randomInit = function(seed1, seed2) {

	return {
		max_value	: 0x3FFFFFFF,
		max_value_dbl	: 0x3FFFFFFF,
		seed1		: seed1 % 0x3FFFFFFF,
		seed2		: seed2 % 0x3FFFFFFF,
	};
};

exports.myRnd = function(r){

	r.seed1 = (r.seed1 * 3 + r.seed2) % r.max_value;
	r.seed2 = (r.seed1 + r.seed2 + 33) % r.max_value;

	return r.seed1 / r.max_value_dbl;
};

exports.scramble323 = function(message, password) {

	if (!password) return new Buffer();
	var to = new Buffer(8);

	var hash_pass = this.hashPassword(password);
	var hash_message = this.hashPassword(message.slice(0, 8));
console.log(hash_pass);
console.log(hash_message);

	var seed1 = this.int32Read(hash_pass, 0) ^ this.int32Read(hash_message, 0);
	var seed2 = this.int32Read(hash_pass, 4) ^ this.int32Read(hash_message, 4);
	var r = this.randomInit(seed1, seed2);

console.log(r);

	for (var i=0; i<8; i++){
		to[i] = Math.floor(this.myRnd(r)*31) + 64;
	}

	return to;
};

exports.fmt32 = function(x){
	var a = x[0].toString(16);
	var b = x[1].toString(16);

	if (a.length == 1) a = "000"+a;
	if (a.length == 2) a = "00"+a;
	if (a.length == 3) a = "0"+a;
	if (b.length == 1) b = "000"+b;
	if (b.length == 2) b = "00"+b;
	if (b.length == 3) b = "0"+b;
	return "" + a + '/' + b;
}

exports.xor32 = function(a,b){
	return [a[0] ^ b[0], a[1] ^ b[1]];
}

exports.add32 = function(a,b){
	var w1 = a[1] + b[1];
	var w2 = a[0] + b[0] + ((w1 & 0xFFFF0000) >> 16);
	return [w2 & 0xFFFF, w1 & 0xFFFF];
}

exports.mul32 = function(a,b){
	// based on this example of multiplying 32b ints using 16b
	// http://www.dsprelated.com/showmessage/89790/1.php
	var w1 = a[1] * b[1];
	var w2 = (((a[1] * b[1]) >> 16) & 0xFFFF) + ((a[0] * b[1]) & 0xFFFF) + (a[1] * b[0] & 0xFFFF);
	return [w2 & 0xFFFF, w1 & 0xFFFF];
}

exports.and32 = function(a,b){
	return [a[0] & b[0], a[1] & b[1]]
}

exports.shl32 = function(a,b){
	// assume b is 16 or less
	var w1 = a[1] << b;
	var w2 = (a[0] << b) | ((w1 & 0xFFFF0000) >> 16);
	return [w2 & 0xFFFF, w1 & 0xFFFF];
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

exports.int31Write = function(buffer, number, offset) {
	buffer[offset] = (number[0] >> 8) & 0x7F;
	buffer[offset+1] = (number[0]) & 0xFF;
	buffer[offset+2] = (number[1] >> 8) & 0xFF;
	buffer[offset+3] = (number[1]) & 0xFF;
};

exports.int32Read = function(buffer, offset){
	return (buffer[offset] << 24)
	     + (buffer[offset+1] << 16)
	     + (buffer[offset+2] << 8)
	     + (buffer[offset+3]);
};
