require('../common');
var client = require('mysql').Client(TEST_CONFIG)
  , gently = new Gently();

client.connect(gently.expect(function connectCb(err) {
  if (err) throw err;

  client.end();
  console.log('So sweet!');
}));