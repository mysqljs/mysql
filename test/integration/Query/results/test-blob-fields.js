var common = require('../../../common');
var assert = require('assert');
var mysql  = require(common.dir.root);

var client = common.createClient();

var bufferSize = 256;
var testBlob = new Buffer(bufferSize);

for (var i = 0; i < bufferSize; ++i) {
	testBlob.writeUInt8(i, i);
}

client.query('CREATE DATABASE '+common.TEST_DB, function createDbCb(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) done(err);
});

client.query('USE '+common.TEST_DB);

client.query(
  'CREATE TEMPORARY TABLE ' + common.TEST_TABLE+
  '(content BLOB);'
);

var sql = 'INSERT ' + common.TEST_TABLE + ' SET content = ?';
var params = [testBlob];

var query = client.query(sql, params, function(err, results) {
	if (err) throw err;
});

function bufferEqual(buffer1, buffer2) {
	if (buffer1.length !== buffer2.length) {
		return false;
	}
	for (var i = 0; i < buffer1.length; ++i) {
		if (buffer1.readUInt8(i) !== buffer2.readUInt8(i)) {
			return false;
		}
	}

	return true;
}

var sql = 'SELECT content FROM ' + common.TEST_TABLE;
var query = client.query(sql, function(err, results) {
	if (err) throw err;
	assert.ok(bufferEqual(results[0].content, testBlob));
	client.destroy();
});
