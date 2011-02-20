require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.host = 'BADHOST';

client.connect(gently.expect(function connectCb(err, result) {
  assert.ok(err.code.match(/ECONNREFUSED|ENOTFOUND/));
}));
