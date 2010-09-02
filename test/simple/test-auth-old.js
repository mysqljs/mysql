require('../common');
var sys = require('sys');

var auth = require('mysql/auth');

function test_hash_password(password, bytes){
	var expected = new Buffer(bytes);
	var actual = auth.hashPassword(password);

	sys.print('hashPassword('+password+')...');
	assert.deepEqual(actual, expected); // , 'hashPassword('+password+') failed');
	sys.print('ok\n');
}

function test_randominit(in1, in2, out1, out2){
	var r = auth.randomInit(in1, in2);
	sys.print('randomInit('+in1+','+in2+')...');
	assert.equal(out1, r.seed1);
	assert.equal(out2, r.seed2);
	sys.print('ok\n');
}

function test_myrnd_sequence(seed1, seed2, expected){

	var r = auth.randomInit(seed1, seed2);

	for(var i=0; i<expected.length; i++){
		var n = auth.myRnd(r);

		// we will test to 14 digits, since
		// we only ever use this function mutliplied
		// by small numbers anyway

		var a = ":"+n;
		var b = ":"+expected[i];

		sys.print('myRnd()->'+a.substr(1, 16)+'...');
		assert.equal(a.substr(1, 16), b.substr(1, 16));
		sys.print('ok\n');
	}
}

test_hash_password('root',			[0x67, 0x45, 0x7E, 0x22, 0x6a, 0x1a, 0x15, 0xbd]);
test_hash_password('long password test',	[0x6c, 0x24, 0x68, 0x41, 0x2c, 0xa6, 0x86, 0x56]);
test_hash_password('saf789yasfbsd89f',		[0x6c, 0x9b, 0x2f, 0x07, 0x17, 0xeb, 0x95, 0xc6]);

test_randominit(0x00000000, 0x00000000, 0x00000000, 0x00000000);
test_randominit(0x0000FFFF, 0x0000FFFF, 0x0000ffff, 0x0000ffff);
test_randominit(0x50000000, 0x50000000, 0x10000001, 0x10000001);
test_randominit(0xFFFFFFFF, 0xFFFFFFFF, 0x00000003, 0x00000003);
test_randominit(3252345, 7149734, 0x0031a079, 0x006d18a6);

test_myrnd_sequence(3252345, 7149734, [
	0.0157456556481734,
	0.0696413620092360,
	0.3009698738353047,
	0.2959253138824602,
	0.5767169786400320,
	0.9958089822864243,
	0.2488940062456708,
	0.2570431151027261,
	0.5385335875102631,
	0.9215386229767824,
]);


var b = auth.scramble323(new Buffer("8bytesofstuff"), "root");
console.log(b);
