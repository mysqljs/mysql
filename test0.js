var mysql      = require('mysql');
var express = require('express')
, http = require('http')
, app = express()
, server = http.createServer(app);

var db_config = {
connectionLimit : 10,
host     : 'localhost',
user     : 'root',
password : 'root!',
database : 'kdtestdb',
supportBigNumbers: true,
}

var pool  = mysql.createPool(db_config);

app.get('/*', function (req, res) {
pool.query('SELECT * FROM test;', function(err, rows, fields) {
if (err){
  console.log("error");
throw err
} else {
  console.log(rows);
res.send(rows);
};
});
});

var listener = app.listen(8080, function() {
  console.log('Express server listening on port ' + listener.address().port);
});
