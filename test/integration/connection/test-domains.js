var assert = require('assert');
var domain = require('domain');
var d1 = domain.create();
var d2 = domain.create();
var d3 = domain.create();
var d4 = domain.create();
var d5 = domain.create();
var d6 = domain.create();
var d7 = domain.create();
var err1, err2, err3, err4, err5, err6, err7;

d1.run(function() {
  var common     = require('../../common');
  var connection = common.createConnection();
  var pool       = common.createPool({ connectionLimit: 1});
  var assert     = require('assert');
 
  d2.run(function() {
    connection.query('SELECT 1', function(err, _rows, _fields) {
      if (err) throw err;
      throw new Error('inside domain 2');
    });
  });
    
  d3.run(function() {
    pool.getConnection(function(err, conn) {
      if (err) throw err;
      d7.run(function() {
        pool.query('SELECT 2', function(err, _rows, _fields) {
          if (err) throw err;
          throw new Error('inside domain 7');
        });
      });
      conn.release();
      throw new Error('inside domain 3');
    });
  });

  d4.run(function() {
    connection.ping(function(err) {
      if (err) throw err;
      throw new Error('inside domain 4');
    });
  });

  d5.run(function() {
    connection.statistics(function(err, stat) {
      if (err) throw err;
      throw new Error('inside domain 5');
    });
  });
  
  d6.run(function() {
    pool.getConnection(function(err, conn) {
      if (err) throw err;
      conn.release();
      throw new Error('inside domain 6');
    });
  });
  
  connection.end();
  setTimeout(function() {
    pool.end();
    throw new Error('inside domain 1');
  }, 100);

  d2.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 2') 
    err2 = err;
  });
  d3.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 3') 
    err3 = err;
  });
  d4.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 4') 
    err4 = err;
  });
  d5.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 5') 
    err5 = err;
  });
  d6.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 6') 
    err6 = err;
  });
  d7.on('error', function(err) {
    assert.equal(''+err, 'Error: inside domain 7') 
    err7 = err;
  });
});

d1.on('error', function(err) {
  assert.equal(''+err, 'Error: inside domain 1');
  err1 = err;
});

process.on('exit', function() {
  assert.equal(''+err1, 'Error: inside domain 1')
  assert.equal(''+err2, 'Error: inside domain 2')
  assert.equal(''+err3, 'Error: inside domain 3') 
  assert.equal(''+err4, 'Error: inside domain 4') 
  assert.equal(''+err5, 'Error: inside domain 5') 
  assert.equal(''+err6, 'Error: inside domain 6') 
  assert.equal(''+err7, 'Error: inside domain 7') 
});
