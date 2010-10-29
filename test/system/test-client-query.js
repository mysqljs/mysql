require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.query(
  'CREATE DATABASE '+TEST_DB,
  gently.expect(function createDbCb(err) {
    if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
      throw err;
    }
  })
);

client.query(
  'USE '+TEST_DB,
  gently.expect(function useDbCb(err) {
    if (err) {
      throw err;
    }
  })
);

client.query(
  'CREATE TEMPORARY TABLE '+TEST_TABLE+
  '(id INT(11) AUTO_INCREMENT, title VARCHAR(255), text TEXT, created DATETIME, PRIMARY KEY (id));',
  gently.expect(function createTableCb(err) {
    if (err) {
      throw err;
    }
  })
);

client.query(
  'INSERT INTO '+TEST_TABLE+' '+
  'SET title = ?, text = ?, created = ?',
  ['super cool', 'this is a nice long text', '2010-08-16 10:00:23'],
  gently.expect(function insertCb(err) {
    if (err) {
      throw err;
    }
  })
);

var query = client.query(
  'INSERT INTO '+TEST_TABLE+' '+
  'SET title = ?, text = ?, created = ?',
  ['another entry', 'because 2 entries make a better test', null]
);

query.on('end', gently.expect(function insertOkCb(packet) {
}));

var query = client.query(
  'SELECT * FROM '+TEST_TABLE,
  gently.expect(function selectCb(err, results, fields) {
    if (err) {
      throw err;
    }

    assert.equal(results.length, 2);
    assert.equal(results[1].title, 'another entry');
    assert.ok(typeof results[1].id == 'number');
    assert.ok(results[0].created instanceof Date);
    assert.strictEqual(results[1].created, null);
    client.end();
  })
);
