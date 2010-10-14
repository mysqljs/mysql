require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently(),
    ECONNREFUSED = process.binding('net').ECONNREFUSED;

client.host = 'BADHOST';

client.connect(gently.expect(function connectCb(err, result) {
  assert.equal(err.errno, ECONNREFUSED);
}));
