var common = require('../../test/common');
var client = common.createClient();

client.query('CREATE DATABASE '+common.TEST_DB, function(err) {
  // db exists
  if (err && err.number != 1007) {
    throw err;
  }
});
client.query('USE '+common.TEST_DB);
client.query('DROP TABLE IF EXISTS '+common.TEST_TABLE);
client.query(
  'CREATE TABLE '+common.TEST_TABLE+' ('+
  'id INT(11) AUTO_INCREMENT, '+
  'title VARCHAR(255), '+
  'text TEXT, '+
  'created DATETIME, '+
  'PRIMARY KEY (id));',
  function(err) {
    if (err) throw err;

    var start = +new Date, inserts = 0, total = 10000;
    function insertOne() {
      client.query('INSERT INTO '+common.TEST_TABLE+' SET title = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"', function() {
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
