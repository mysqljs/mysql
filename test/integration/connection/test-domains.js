var assert = require('assert');
var domain = require('domain');
var d1 = domain.create();
var d2 = domain.create();
var d3 = domain.create();
var d4 = domain.create();
var err1, err2, err3, err4;

d1.namename = '_1';
d2.namename = '_2';
d3.namename = '_3';
d4.namename = '_4';

d1.run(function() {
  var common     = require('../../common');
  var connection = common.createConnection();
  var assert     = require('assert');
 
  d2.run(function() {
    connection.query('SELECT 1', function(err, _rows, _fields) {
      if (err) throw err;
      throw new Error('inside domain 2');
    });
  });

  d3.run(function() {
    connection.query('SELECT 2', function(err, _rows, _fields) {
      if (err) throw err;
      throw new Error('inside domain 3');
    });
  });

  d4.run(function() {
   connection.ping(function() {
     throw new Error('inside domain 4');
   });
  });

  connection.end();
  setTimeout(function() {
    throw new Error('inside domain 1');
  }, 100);

  d2.on('error', function(err) {
    err2 = err;
  });
  d3.on('error', function(err) {
    err3 = err;
  });
  d4.on('error', function(err) {
    err4 = err;
  });

});

d1.on('error', function(err) {
  err1 = err;
});

process.on('exit', function() {
  assert.equal(''+err1, 'Error: inside domain 1')
  assert.equal(''+err2, 'Error: inside domain 2')
  assert.equal(''+err3, 'Error: inside domain 3') 
  //assert.equal(''+err4, 'Error: inside domain 4') 
});
