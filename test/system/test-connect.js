require('../common');
var client = require('mysql').Client(TEST_CONFIG)
  , gently = new Gently();

client.database = '';

client.connect(gently.expect(function connectCb(err) {
  if (err) throw err;

  client.end();
}));