var common = require('../../common');
var mysql = require(common.dir.lib + '/mysql');
var client = mysql.createClient(TEST_CONFIG);
var gently = new Gently();
var REPEATS = 500;
var fs = require('fs');

client.connect();

client.query('CREATE DATABASE '+TEST_DB, function(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) {
    throw err;
  }
});
client.query('USE '+TEST_DB);

client.query('DROP TABLE IF EXISTS columnia');
var fixture = fs.readFileSync(TEST_FIXTURES+'/columnia.sql', 'utf8');
client.query(fixture);

var finished = 0;
for (var i = 0; i < REPEATS; i++) {
  (function(i) {
    var query = client.query("SHOW COLUMNS FROM columnia");

    query.on('row', function(row) {
      if (!row.Type) {
        throw new Error('Column order mixed up after '+i+' queries.');
      }
    });

    query.on('end', function() {
      finished++;
      if (finished === REPEATS) {
        process.exit(0);
      }
    });
  })(i);
}

