// Last v8 profile when running this test for 500k rows:
// https://gist.github.com/f85c38010c038e5efe2e
var common = require('../../test/common');
var client = common.createClient();
var rows   = 0;

client.typeCast = false;

client.query('USE '+common.TEST_DB);
var selectStart = +new Date;

function query() {
  client
    .query('SELECT * FROM '+common.TEST_TABLE)
    .on('row', function(row) {
      rows++;
    })
    .on('end', function() {
      if (rows < 1000000) {
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
