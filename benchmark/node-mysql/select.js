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
client
  .query('SELECT * FROM '+TEST_TABLE)
  .on('row', function(row) {
    rows++;
  })
  .on('end', function() {
    assert.strictEqual(rows, 10000);

    var duration = (+new Date - selectStart) / 1000,
        rowsPerSecond = rows / duration;
    console.log('%d rows / second', rowsPerSecond.toFixed(2));
    console.log('%d ms', +new Date - selectStart);
    client.end();
  });
