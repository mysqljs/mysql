var SqlString = exports;

SqlString.escape = function(val, stringifyObjects) {
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

  if (Array.isArray(val)) {
    return SqlString.arrayToList(val);
  }

  if (typeof val === 'object') {
    if (stringifyObjects) {
      val = val.toString();
    } else {
      return SqlString.objectToValues(val);
    }
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

SqlString.arrayToList = function(array) {
	return array.map(function(v) {
		if (Array.isArray(v)) return '(' + SqlString.arrayToList(v) + ')';
		return SqlString.escape(v, true);
	}).join(', ');
};

function zeroPad(number) {
  return (number < 10)
    ? '0' + number
    : number;
}

SqlString.format = function(sql, values) {
  values = [].concat(values);

  return sql.replace(/\?/g, function(match) {
    if (!values.length) {
      return match;
    }

    return SqlString.escape(values.shift());
  });
};

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
  var hex = '';
  try {
    hex = buffer.toString('hex');
  } catch (err) {
    // node v0.4.x does not support hex / throws unknown encoding error
    for (var i = 0; i < buffer.length; i++) {
      var byte = buffer[i];
      hex += zeroPad(byte.toString(16));
    }
  }

  return "X'" + hex+ "'";
};

SqlString.objectToValues = function(object) {
  var values = [];
  for (var key in object) {
    var value = object[key];
    if(typeof value === 'function') {
      continue;
    }

    values.push('`' + key + '` = ' + SqlString.escape(value, true));
  }

  return values.join(', ');
};
