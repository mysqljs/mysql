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

	password = new Buffer(password);
	for (var i = 0; i < password.length; i++) {
		var c = password[i];
		if (c == 32 || c == 9) {
			// skip space in password
			continue;
		}

		// nr^= (((nr & 63)+add)*c)+ (nr << 8);
		// nr = xor(nr, add(mul(add(and(nr, 63), add), c), shl(nr, 8)))
		nr = this.xor32(
			nr,
			this.add32(
				this.mul32(
					this.add32(
						this.and32(nr, [0,63]),
						[0,add]
					),
					[0,c]
				),
				this.shl32(nr, 8)
			)
		);

		// nr2+=(nr2 << 8) ^ nr;
		// nr2 = add(nr2, xor(shl(nr2, 8), nr))
		nr2 = this.add32(nr2, this.xor32(this.shl32(nr2, 8), nr));

		// add+=tmp;
		add += c;
	}

	this.int32Write2(result, nr, 0);
	this.int32Write2(result, nr2, 4);

	return result;
}

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

	var low = a[1] + b[1];
	var rem = (low & 0xFFFF0000) >> 16;
	var high = a[0] + b[0] + rem;

	return [high & 0xFFFF, low & 0xFFFF];
}

exports.mul32 = function(a,b){

	var x = a[1] * b[1];
	var y = a[0] * b[1];
	var z = a[1] * b[0];
	var w = a[0] * b[0];

	var col1 = x & 0xFFFF;
	var col2 = ((x >> 16) & 0xFFFF) + (y & 0xFFFF) + (z & 0xFFFF);
	var col3 = ((y >> 16) & 0xFFFF) + ((z >> 16) & 0xFFFF) + (w & 0xFFFF);
	var col4 = ((w >> 16) & 0xFFFF);

	var w1 = col1;
	var w2 = col2 & 0xFFFF;
	var col2_over = ((col2 >> 16) & 0xFFFF);
	var w3 = (col3 + col2_over) & 0xFFFF;
	var col3_over = ((w3 >> 16) & 0xFFFF);
	var w4 = (col4 + col3_over) & 0xFFFF;

	return [w2, w1];
}

exports.and32 = function(a,b){
	return [a[0] & b[0], a[1] & b[1]]
}

exports.shl32 = function(a,b){
	// assume b is 16 or less
	var low = a[1] << b;
	var rem = (low & 0xFFFF0000) >> 16;
	var high = (a[0] << b) | rem;

	return [high & 0xFFFF, low & 0xFFFF];
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

exports.int32Write2 = function(buffer, number, offset) {
	buffer[offset] = (number[0] >> 8) & 0x7F;
	buffer[offset+1] = (number[0]) & 0xFF;
	buffer[offset+2] = (number[1] >> 8) & 0xFF;
	buffer[offset+3] = (number[1]) & 0xFF;
};
