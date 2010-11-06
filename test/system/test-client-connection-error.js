require('../common');
var Client = require('mysql').Client,
    client = Client(TEST_CONFIG),
    gently = new Gently(),
    netConstants = require('mysql/net_constants');
    ECONNREFUSED = netConstants.ECONNREFUSED,
    ENOTFOUND = netConstants.ENOTFOUND;

client.host = 'BADHOST';

client.connect(gently.expect(function connectCb(err, result) {
  assert.ok(err.errno & (ECONNREFUSED | ENOTFOUND));
}));
