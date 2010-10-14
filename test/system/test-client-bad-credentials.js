require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently();

client.password = 'WRONG PASSWORD';

client.connect(gently.expect(function connectCb(err, result) {
  assert.equal(err.number, Client.ERROR_ACCESS_DENIED_ERROR);
}));
