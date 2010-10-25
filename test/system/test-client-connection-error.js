require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently(),
    ECONNREFUSED = process.binding('net').ECONNREFUSED;
    ENOTFOUND = process.binding('net').ENOTFOUND;

client.host = 'BADHOST';

client.connect(gently.expect(function connectCb(err, result) {
  assert.ok(err.errno & (ECONNREFUSED | ENOTFOUND));
}));
