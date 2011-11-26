var common  = require('../../../common');
var assert  = require('assert');
var fs      = require('fs');
var mysql   = require(common.dir.root);
var REPEATS = 500;

var client = common.createClient();
client.query('CREATE DATABASE ' + common.TEST_DB, function(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) throw err;
});
client.query('USE ' + common.TEST_DB);

client.query('DROP TABLE IF EXISTS columnia');
var fixture = fs.readFileSync(common.dir.fixture + '/columnia.sql', 'utf8');
client.query(fixture);

var finished = 0;
var self = this;
for (var i = 0; i < REPEATS; i++) {
  (function(i) {
    var query = client.query("SHOW COLUMNS FROM columnia");

    query.on('row', function(row) {
      if (!row.Type) throw new Error('Column order mixed up after '+i+' queries.');
    });

    query.on('end', function() {
      finished++;
      if (finished === REPEATS) client.destroy();
    });
  })(i);
}

process.on('exit', function() {
  assert.equal(finished, REPEATS);
});
