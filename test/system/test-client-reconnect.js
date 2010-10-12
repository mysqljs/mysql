require('../common');
var Client = require('mysql').Client,
    gently = new Gently(),
    client = new Client(TEST_CONFIG);

client.connect(gently.expect(function connectCb(err, result) {
  assert.ifError(err);
}));

client.end(gently.expect(function endCb() {
}));

client.connect(gently.expect(function connectCb2(err, result) {
  assert.ifError(err);

  client.end();
}));

