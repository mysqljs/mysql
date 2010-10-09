require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.ping(gently.expect(function pingCb(err) {
  if (err) throw err;
}));

client.end();
