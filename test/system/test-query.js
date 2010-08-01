require('../common');
var client = require('mysql').Client(TEST_CONFIG)
  , gently = new Gently();

// our test db does not exist yet, so don't try to connect to it
client.database = '';

client.connect();

client.query
  ( 'CREATE TEMPORARY TABLE '+TEST_CONFIG.database
  + '(id INT(11), title VARCHAR(255), text TEXT);'
  , gently.expect(function queryCb(err) {
      if (err) {
        throw err;
      }

      
    })
  );