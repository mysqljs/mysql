var Packets    = require('./packets');
module.exports = ResultSet;
function ResultSet(resultSetHeaderPacket) {

  Array.call(this);

  (function(context) {

    var _resultSetHeaderPacket = resultSetHeaderPacket, _fieldPackets = [], _eofPackets = [], _parent = null, _serverInfo = {};

    Object.defineProperties(context, {
      resultSetHeaderPacket: {
        get : function() {
          return _resultSetHeaderPacket;
        },
        enumerable: false
      },
      fieldPackets: {
        get : function() {
          return _fieldPackets;
        },
        enumerable: false
      },
      eofPackets: {
        get : function() {
          return _eofPackets;
        },
        enumerable: false
      },
      _parent: {
        get: function() {
          return _parent;
        }
        ,
        set: function(value) {
          _parent = value;
        },
        enumerable: false

      },
      serverInfo : {
        get : function() {

          if(_serverInfo instanceof Packets.OkPacket)
            return _serverInfo;
          else if(!_parent || !(_parent instanceof Array))
            return null;

          for(var i = _parent.indexOf(this) + 1, len = _parent.length; i < len; i++) {
            if(_parent[i] instanceof Packets.OkPacket)
              return _parent[i];
          }

          for(var i = _parent.indexOf(this) - 1; i >= 0; i--) {
            if(_parent[i] instanceof Packets.OkPacket)
              return _parent[i];
          }

          return null;
        },
        set : function(value) {
          if(value instanceof Packets.OkPacket)
            _serverInfo = value;

        },
        enumerable: false
      },
      columns : {
        get : function() {
          return _fieldPackets;
        },
        enumerable: false
      },
      fieldCount : {
        get : function() {
          return (this.serverInfo||_serverInfo).fieldCount;
        },
        enumerable: false
      },
      affectedRows : {
        get : function() {
          return (this.serverInfo||_serverInfo).affectedRows;
        },
        enumerable: false
      },
      insertId : {
        get : function() {
          return (this.serverInfo||_serverInfo).insertId;
        },
        enumerable: false
      },
      serverStatus : {
        get : function() {
          return (this.serverInfo||_serverInfo).serverStatus;
        },
        enumerable: false
      },
      warningCount : {
        get : function() {
          return (this.serverInfo||_serverInfo).warningCount;
        },
        enumerable: false
      },
      message : {
        get: function() {
          return (this.serverInfo||_serverInfo).message;
        },
        enumerable: false
      },
      rows : {
        get : function() {
          return Array.prototype.slice.call(this);
        },
        enumerable : false
      }



    })

  })(this);

};

ResultSet.prototype.__proto__ = Array.prototype;
