/**
 * This test case ensures that UTF-8 characters are properly decoded when data coming
 * back from mysql comes back in several packets. In this case data packets may be
 * cut in pieces that do not perfectly match UTF-8 characters boundaries, and therefore
 * lead to data corruption if characters decoding is not done properly.
 *
 * Note that the nature of the issue makes it difficult to test. This test case makes
 * the issue very probable but cannot guarantee it. If it fails, it definitely means
 * there is a bug, but success does not guarantee ther is no bug.
 */

var common = require('../../../common');
var assert = require('assert');
var mysql  = require(common.dir.root);

var client = common.createClient();
client.query('CREATE DATABASE '+common.TEST_DB, function createDbCb(err) {
  if (err && err.number != mysql.ERROR_DB_CREATE_EXISTS) done(err);
});

client.query('USE '+common.TEST_DB);

var table = common.TEST_TABLE;
client.query(
  'CREATE TEMPORARY TABLE ' + table +
  '(txt varchar(2048) CHARACTER SET utf8 COLLATE utf8_bin, ' +
  'txt2 varchar(2048) CHARACTER SET utf8 COLLATE utf8_bin);'
);


// Create a string with a 3 bytes UTF-8 character so that we have a pretty good change
// that the data packet may be split on a random byte not being a UTF8 boundary
var c = '\u3042';
var len = 405;
var val = '';
for( var i=0; i<len; i++ ) {
  val += c;
}

// Insert many lines in the database
var nlines = 1000;
var count = nlines;
var insert = function () {
  client.query(
    'INSERT INTO ' + table + ' ' + 'SET txt = ?, txt2 = ? ', [val, val], function (err, results, fields) {
      count--;
      if( count > 0 ) {
        insert();
      }
      else {

        // After all insertions are done, check results
        var query = client.query('SELECT txt, txt2 FROM '+ table, [], function selectCb(err, results, fields) {
          assert.ok( err == null );
          assert.ok(results.length==nlines);
          for( var i=0; i<results.length; i++ ) {
            var row = results[i];
            var txt = row.txt;
            var txt2 = row.txt2;
            // Check that we correctly read what was written
            assert.ok( txt.length===len );
            assert.ok( txt === txt2 );
            for( var j=0; j<len; j++) {
              assert.ok( txt[j] === c );
            }
          }
          client.destroy();
        });


      }
    }
  );
};
insert();



