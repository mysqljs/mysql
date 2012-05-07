var SqlString = exports;

SqlString.escape = function(val) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? 'true' : 'false';
    case 'number': return val+'';
  }

  if (val instanceof Date) {
    val = SqlString.dateToString(val);
  }

  if (Buffer.isBuffer(val)) {
    return SqlString.bufferToString(val);
  }

  if (typeof val === 'object') {
    val = val.toString();
  }

  val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
    switch(s) {
      case "\0": return "\\0";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\b": return "\\b";
      case "\t": return "\\t";
      case "\x1a": return "\\Z";
      default: return "\\"+s;
    }
  });
  return "'"+val+"'";
};

function zeroPad(number) {
  return (number < 10)
    ? '0' + number
    : number;
}

SqlString.dateToString = function(date) {
  var year   = date.getFullYear();
  var month  = zeroPad(date.getMonth() + 1);
  var day    = zeroPad(date.getDate());
  var hour   = zeroPad(date.getHours());
  var minute = zeroPad(date.getMinutes());
  var second = zeroPad(date.getSeconds());

  return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
};

SqlString.bufferToString = function(buffer) {
  var hex = buffer.toString('hex');
  return "X'" + hex+ "'";
};
