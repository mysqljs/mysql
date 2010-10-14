require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.connect();

client.useDatabase(TEST_DB, gently.expect(function useDbCb(err) {
  if (err) throw err;
}));

client.end();
