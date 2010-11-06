// Last v8 profile when running this test for 500k rows:
// https://gist.github.com/f85c38010c038e5efe2e
require('../../test/common');
var Client = require('mysql/client'),
    client = Client(TEST_CONFIG),
    rows = 0;

client.typeCast = false;

client.connect();
client.query('CREATE DATABASE '+TEST_DB, function(err) {
  if (err && err.number != Client.ERROR_DB_CREATE_EXISTS) {
    throw err;
  }
});

client.query('USE '+TEST_DB);
var selectStart = +new Date;

function query() {
  client
    .query('SELECT * FROM '+TEST_TABLE)
    .on('row', function(row) {
      rows++;
    })
    .on('end', function() {
      if (rows < 10000) {
        query();
        return;
      }

      var duration = (+new Date - selectStart) / 1000,
          rowsPerSecond = rows / duration;
      console.log('%d rows / second', rowsPerSecond.toFixed(2));
      console.log('%d ms', +new Date - selectStart);
      client.end();
    });
}

query();
