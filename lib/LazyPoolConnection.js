var 
    Connection = require("./PoolConnection")
  , EventEmitter = require('events').EventEmitter;
  
  
var LazyPoolConnection = function( pool ){
  
  this._pool = pool;
  this._connection = null;
  // used internally to dispatch connection obtaining error
  this._eventEmitter = new EventEmitter();
  // store callbacks for events of Connection object, when it not instantiated yet
  this._temporaryCallbacks = [];
  
  this.__defineGetter__("state", function(){
    
    if( !this._connection ){
      return "disconnected";
    }
    
    return this._connection.state;
    
  });
    
};

/*  
 * Returns real PoolConnection to cb
 */
LazyPoolConnection.prototype._getConnection = function( cb ){
  
  var that = this;
  
  if( this._connection ){
    return cb(null, this._connection);
  }
  
  this._pool.getConnection( function( error, connection ){

    if( error ){
      return cb(error);
    }
    
    that._connection = connection;
    
    // set event listeners
    
    for( var i = 0; i != that._temporaryCallbacks.length; i++ ){
      var listener = that._temporaryCallbacks[i];

      that._connection[listener.method]( listener.eventName, listener.cb );
    }
    
    that._eventEmitter.removeAllListeners();
    
    cb( null, connection );
    
  } );
  
};
/*
 * process on and once calls of EventEmitter
 */
LazyPoolConnection.prototype._processOn = function( method, eventName, cb ){
  
  if( !this._connection ){
    this._eventEmitter[method](eventName, cb);
    
    this._temporaryCallbacks.push({
      method: method,
      eventName: eventName,
      cb: cb
    });
  }
  else{
    this._connection[method](eventName, cb);
  }
  
};

// proxy Connection methods

var proxyMethods = [];
for( var k in Connection.prototype ){
  
  if( typeof Connection.prototype[k] != "function" ){
    continue;   
  }
  
  proxyMethods.push(k);
  
}

proxyMethods.forEach(function( name ){
  
  // ignoring private methods
  if( name[0] == "_" ){
    return;
  }
  
  LazyPoolConnection.prototype[name] = function(  ){
        
    var that = this;    
    var args = Array.prototype.slice.call(arguments);   
    
    if( ["on", "once"].indexOf( name ) != -1 ){
      return that._processOn( name, args[0], args[1] );
    }
    
    if( ["end", "release"].indexOf( name ) != -1 ){
      if( !that._connection ){
        //swallow this call
        return;
      }
    }

    that._getConnection( function( error, connection ){
      
      if( error ){        
        if( args.length > 0 && typeof args[args.length-1] == "function" ){
          args[args.length-1]( error );
        } 
        
        that._eventEmitter.emit( "error", error );
        
        return;   
      }
      
      connection[name].apply( connection, args );
      
    } );
    
  };
  
});


module.exports = LazyPoolConnection;
