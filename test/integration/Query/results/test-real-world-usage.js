var common = require('../../../common');
var assert = require('assert');
var mysql  = require(common.dir.root);

var client = common.createClient();
client.query('CREATE DATABASE '+common.TEST_DB, function createDbCb(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) done(err);
});

client.query('USE '+common.TEST_DB);

client.query(
  'CREATE TEMPORARY TABLE ' + common.TEST_TABLE+
  '(id INT(11) AUTO_INCREMENT, title VARCHAR(255), text TEXT, created DATETIME, PRIMARY KEY (id));'
);

client.query(
  'INSERT INTO ' + common.TEST_TABLE + ' '+
  'SET title = ?, text = ?, created = ?',
  ['super cool', 'this is a nice long text', '2010-08-16 10:00:23']
);

var query = client.query(
  'INSERT INTO '+common.TEST_TABLE+' '+
  'SET title = ?, text = ?, created = ?',
  ['another entry', 'because 2 entries make a better test', null]
);

var endCalled = false;
query.on('end', function insertOkCb(packet) {
  endCalled = true;
});

var lastQueryReached = false;
var query = client.query('SELECT * FROM '+common.TEST_TABLE, function selectCb(err, results, fields) {
  assert.ok(endCalled);

  lastQueryReached = true;

  assert.equal(results.length, 2);
  assert.equal(results[1].title, 'another entry');
  assert.ok(typeof results[1].id == 'number');
  assert.ok(results[0].created instanceof Date);
  assert.strictEqual(results[1].created, null);

  client.destroy();
});

process.on('exit', function() {
  assert.ok(lastQueryReached);
});
