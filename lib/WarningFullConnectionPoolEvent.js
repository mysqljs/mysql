module.exports = WarningFullConnectionPoolEvent;

function WarningFullConnectionPoolEvent(pool) {
  this._pool = pool;
  this._data = [];

  for(var i in pool._allConnections) {
    this._data.push(new ConnectionData(pool._allConnections[i]));
  }
}

WarningFullConnectionPoolEvent.prototype.getData = function () {
  return this._data;
}

function ConnectionData(conn) {
  this._conn = conn;
  this._stack = conn._stack;
  this._lastQuery = conn._lastQuery;
  this._lastQueryStack = conn._lastQueryStack;
}

ConnectionData.prototype.getStack = function () {
  return this._stack;
}

ConnectionData.prototype.getLastQuery = function () {
  return this._lastQuery;
}

ConnectionData.prototype.getLastQueryStack = function () {
  return this._lastQueryStack;
}

ConnectionData.prototype.toString = function () {
  var str = "";
  str += "Full Mysql Connection Pool - lastConnectionData\n";
  str += "stack : " + this.getStack() + "\n";
  str += "query : " + this.getLastQuery() + "\n";
  str += "query stack : " + this.getLastQueryStack() + "\n";
  return str;
}
