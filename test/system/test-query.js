require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

// our test db does not exist yet, so don't try to connect to it
client.database = '';

client.connect();

client.query(
  'CREATE DATABASE '+TEST_CONFIG.database,
  gently.expect(function createDbCb(err) {
    if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
      throw err;
    }
  })
);

client.query(
  'USE '+TEST_CONFIG.database,
  gently.expect(function useDbCb(err) {
    if (err) {
      throw err;
    }
  })
);

client.query(
  'CREATE TEMPORARY TABLE '+TEST_TABLE+
  '(id INT(11), title VARCHAR(255), text TEXT);',
  gently.expect(function createTableCb(err) {
    if (err) {
      throw err;
    }
  })
);

client.query(
  'INSERT INTO '+TEST_TABLE+' '+
  'SET title = ?, text = ?',
  ['super cool', 'this is a nice long text'],
  gently.expect(function insertCb(err) {
    if (err) {
      throw err;
    }
  })
);

var query = client.query(
  'SELECT * FROM '+TEST_TABLE,
  gently.expect(function selectCb(err, results) {
    if (err) {
      throw err;
    }

    console.log('rows: %j', rows);
    client.end();
  })
);

// query
//   .on('fields', function(fields) {
//     console.log('fields: %j', fields);
//   })
//   .on('row', function(row) {
//     console.log('row: %j', row);
//   });
