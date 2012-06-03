var common     = require('../common');
var Pool       = require('../../lib/Pool');
var _          = require('underscore');
var pool       = new Pool(null,{
  poolSize: 10,
  endOnRelease: false,
  createConnection: common.createConnection,
  resetSessionOnRelease: true,
});
var assert     = require('assert');

function checkDatabase(expectedDB,client,cb){
  var sql = "select database() as `db`";
  client.query(sql,function(err,info){
    if (err) {
      throw err;
    }
    assert.equal(info[0]['db'],expectedDB);
    cb(client);
  });
}
function changeDB(dbName,client,cb) {
  client.changeUser({database:dbName},cb);
}
function step(fn,err,info){

}
var rows = undefined;

for (var i = 0; i< 20; i++){
  pool.alloc(function(err,client){
    if (err) {
      throw (err);
    } else {
      checkDatabase(null,client, function(client){
        changeDB('test', client, function(err){
          if (err) {
            throw err;
          }
          checkDatabase('test',client, function(client){
            pool.free(client);
          });
        });
      });
    }
  });  
}

setTimeout(function(){
  pool.end();
},5000);


process.on('exit', function() {
  //see if we can find an "free" connection, we should not
  var conn = pool._findUnallocated();
  assert.equal(conn,false);
});