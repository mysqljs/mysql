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

test_hash_password('root',			[0x67, 0x45, 0x7E, 0x22, 0x6a, 0x1a, 0x15, 0xbd]);
test_hash_password('long password test',	[0x6c, 0x24, 0x68, 0x41, 0x2c, 0xa6, 0x86, 0x56]);
test_hash_password('saf789yasfbsd89f',		[0x6c, 0x9b, 0x2f, 0x07, 0x17, 0xeb, 0x95, 0xc6]);
