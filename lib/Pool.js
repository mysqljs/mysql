var EventEmitter  = require('events').EventEmitter;
var Util          = require('util');
var Connection    = require('./Connection');

module.exports = Pool;
Util.inherits(Pool, EventEmitter);

function Pool(mysqlOptions,poolOptions) {
  EventEmitter.call(this);
  
  this.connections        = [];
  this.allocRequests = [];
  this.options       = { poolSize: 10,
                         endOnRelease: false,
                         resetSessionOnRelease: false, 
                       };
  poolOptions = poolOptions || {};
  for (var prop in poolOptions){
    this.options[prop] = poolOptions[prop];
  }
  
  if ('function' === typeof this.options.createConnection) {
    this._createConnection = this.options.createConnection;
  } else {
    this._createConnection  = function() { 
      return new Connection( {config: mysqlOptions});
    }
  }
}
var idCounter = 0;
Pool.prototype.createConnection = function(cb) {
  var self        = this;
  if (this.connections.length < this.options.poolSize) {
    var conn        = this._createConnection();
    conn.id         = idCounter++;
    conn.allocated  = true;    
    
    this._addEventListeners(conn);
    this.connections.push(conn);
    
    conn.connect( function(err) {
      if (err) {
        self._doCallback(cb,[err,false]);
      } else {
        self._doCallback(cb,[false,conn]);
      }
    });    
  } else {
    var err   = new Error("Cannot add to pool; pool at size configured.");
    err.fatal = false;
    err.code  = 'POOL_POOLSIZE_LIMIT'
    self._doCallback(cb,[err,false]);
  }
}

Pool.prototype.alloc = function(cb,shift) {
  if ('function' === typeof cb) {
    var self = this;    
    this._getUnallocatedConnection(function(err,conn) {      
      if ( err ) {
        if ( err.code && err.code == 'POOL_POOLSIZE_LIMIT' ) {
          self._queueAllocation(cb,shift);
        } else {          
          self._doCallback(cb,[err]);
        }
      } else if (conn && conn._socket) {  
        self._doCallback(cb,[false,conn]);
      } else {
        self._queueAllocation(cb,shift);
      }
    });
  } else {
    throw new Error("Callback not provided to alloc");
  }
}

Pool.prototype.free = function(conn) {
  var self = this;
  if (this.options.endOnRelease === true) {
    conn.end();
  } else if (this.options.resetSessionOnRelease === true) {    
    conn.changeUser( this._onChangeUser.bind(this,conn) );
  } else {
    this._doRelease(conn);
  }
}
Pool.prototype.dealloc = Pool.prototype.free;
Pool.prototype.release = Pool.prototype.free;

Pool.prototype.query = function(sql,values,cb) {
  if (typeof values === 'function') {
    cb     = values;
    values = null;
  }
  
  var self    = this;
  var allocCb = function(err,conn) {
    if (err) {
      cb(err);
    } else {
      conn.query(sql,values,function(err,info) {        
        cb(err,info);
      });
    }
    self.free(conn);
  }
  
  this.alloc(allocCb);
}

Pool.prototype.end = function() {  
  this.connections.forEach( function(conn){
    conn.end();   
  });
}
Pool.prototype.escape = Connection.prototype.escape;


Pool.prototype._addEventListeners = function(conn) {
  conn.on('error', this._onConnectionError.bind(this, conn));
  conn.on('close', this._onConnectionClose.bind(this, conn));
  conn.on('end', this._onConnectionClose.bind(this, conn));
}

Pool.prototype._doCallback = function(cb,args){
  if ('function' === typeof cb) {
    cb.apply(undefined,args);
  }
}

Pool.prototype._doRelease = function(conn){
  conn.allocated = false;
  this._onRelease();
}
/*
Pool.prototype._findUnallocated = function(conn,idx,list) {
  var connGood = (! conn.allocated) && (conn._socket);
  if ( connGood ) { 
    conn.allocated = true;
    return true;
  }
  
  return false;
}*/
Pool.prototype._findUnallocated = function(){
  var conn;
  for (var i = 0; i<this.connections.length; i++) {
    conn         = this.connections[i];
    var connGood = (! conn.allocated) && (conn._socket);
    if (connGood) {
      conn.allocated = true;
      return conn;
    }
  }
  return false;
}
Pool.prototype._getUnallocatedConnection = function(cb) {
  var conn = this._findUnallocated();   
  var self = this;
  if (! conn ) {
    var canConnect = this.connections.length < this.options.poolSize;
    if ( canConnect) {
      //need to go nextTick or multiple creates in same
      //cycle will cause a Connection lost error
      process.nextTick( this.createConnection.bind(self,cb) );
    } else {
      this._doCallback(cb,[false,false]);
    }
  } else {
    this._doCallback(cb,[false,conn]);
  }
}
Pool.prototype._onChangeUser = function(conn,err) {
  if (err) {
    conn.emit('error',err);
  } else {
    this._doRelease(conn);
  }
}
Pool.prototype._onConnectionClose = function(conn) {
  this._removeConnection(conn);
}

Pool.prototype._onConnectionError = function(conn,err) {
  if (err.fatal) {
    this._removeConnection(conn);
  }
  //emit error and connection it relates to
  this.emit('error',err,conn);
}

Pool.prototype._onRelease = function() {
  if (this.allocRequests.length > 0){  
    var cb = this.allocRequests.shift();
    this.alloc(cb,true);
  }
}

Pool.prototype._queueAllocation = function(cb,shift) {
  if (shift){
    this.allocRequests.unshift(cb);
  } else {
    this.allocRequests.push(cb);
  }
}

Pool.prototype._removeConnection = function(conn) {
  var idx  = this.connections.indexOf(conn);
  var self = this;

  if (idx >= 0 ) {
    var removed = self.connections.splice(idx,1);
    removed.forEach(function(conn){
      self.emit('removed',conn);
    });
  }
  
  this._onRelease();
}