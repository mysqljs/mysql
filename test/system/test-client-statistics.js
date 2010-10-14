require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.statistics(gently.expect(function statisticsCb(err, statistics) {
  if (err) throw err;

  assert.ok(statistics.extra.match(/time/i));
}));

client.end();
