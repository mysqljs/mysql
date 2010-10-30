require('../../common');
var Client = require('mysql').Client,
    mainClient = Client(TEST_CONFIG),
    originalMaxConnections;


function setMaxConnectionsToOne() {
  mainClient.connect();
  // First we figure out the current max_connections value, so we can restore that after the test
  mainClient.query('SHOW VARIABLES WHERE Variable_name = ?', ['max_connections'], function(err, results) {
    if (err) throw err;

    originalMaxConnections = parseInt(results[0].Value);
    if (originalMaxConnections === 1) {
      console.log(
        'MySql already had max_connections set to 1. '+
        'This probably happened because of a mal-function in this test, so re-setting to the MySql default of 100. '+
        'If you had a higher value configured, you need to manually fix this now.'
      );
      originalMaxConnections = 100;
    }

    // Now we set max connections to 1, then we continue with our test
    mainClient.query('SET GLOBAL max_connections = ?', [1], function() {
      connectTwoClients();
    });
  });
};

function connectTwoClients() {
  var client1 = Client(TEST_CONFIG);
  client1.connect(function(err) {
    if (err) {
      // There should be no error for the first connection, but if there is one
      // anyway, let's try to at least restore the server config before throwing
      restoreMaxConnections(function() {
        throw err;
      });
      return;
    }

    var client2 = Client(TEST_CONFIG);
    client2.connect(function(err) {
      assert.strictEqual(err.number, Client.ERROR_CON_COUNT_ERROR);

      client1.end();
      restoreMaxConnections();
    });
  });
}

function restoreMaxConnections(cb) {
  mainClient.query('SET GLOBAL max_connections = ?', [originalMaxConnections], cb);
  mainClient.end();
}

setMaxConnectionsToOne();

