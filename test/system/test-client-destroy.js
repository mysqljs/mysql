require('../common');
var Client = require('mysql').Client;

var gently = new Gently(),
    client = new Client(TEST_CONFIG);

client.connect(function() {
  throw new Error('Destroy did not prevent client from connecting.');
});

client.destroy();
