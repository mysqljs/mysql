require('../../test/common');
var Client = require('mysql/client'),
    client = Client(TEST_CONFIG);

client.connect();

client.query('CREATE DATABASE '+TEST_DB, function(err) {
  if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
    throw err;
  }
});
client.query('USE '+TEST_DB);
client.query('DROP TABLE IF EXISTS '+TEST_TABLE);
client.query(
  'CREATE TABLE '+TEST_TABLE+' ('+
  'id INT(11) AUTO_INCREMENT, '+
  'title VARCHAR(255), '+
  'text TEXT, '+
  'created DATETIME, '+
  'PRIMARY KEY (id));',
  function(err) {
    if (err) throw err;

    var start = +new Date, inserts = 0, total = 10000;
    function insertOne() {
      client.query('INSERT INTO '+TEST_TABLE+' SET title = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"', function() {
        inserts++;
        if (inserts < total) {
          insertOne();
        } else {
          var duration = (+new Date - start) / 1000,
              insertsPerSecond = inserts / duration;

          console.log('%d inserts / second', insertsPerSecond.toFixed(2));
          console.log('%d ms', +new Date - start);
          client.end();
        }
      });
    }
    insertOne();
  }
);
