var common     = require('../common');
var Pool       = require('../../lib/Pool');
var _          = require('underscore');
var pool       = new Pool(null,{
  poolSize: 10,
  endOnRelease: false,
  createConnection: common.createConnection.bind(undefined,{
    multipleStatements: true})
});
var assert     = require('assert');

var rows = undefined;

for (var i = 0; i<20; i++){
  pool.alloc(function(err,conn){
    if (err) {
      throw (err);
    } else {
      conn.on('error',function(err){
        console.log(err);
      });
      conn.query("SELECT SLEEP(2);SELECT ? AS `connection.id`;",[conn.id],
        function( err, info ) {
          if (err) {
            throw (err);
          } else {
            //assert conn.id < default pool size          
            assert.equal(true, ( info[1][0]['connection.id'] < pool.options.poolSize));            
          }
          pool.release(conn); //or pool.free or pool.dealloc
        }
      );
    }
  });  
}

setTimeout(function(){
  pool.end();
},10000);


process.on('exit', function() {
  //see if we can find an "free" connection, we should not  
  var conn = pool._findUnallocated();
  assert.equal(conn,false);
});