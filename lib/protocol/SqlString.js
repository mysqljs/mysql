var SqlString = exports;

SqlString.escapeId = function (val, forbidQualified) {
  if (Array.isArray(val)) {
    return val.map(function(v) {
      return SqlString.escapeId(v, forbidQualified);
    }).join(', ');
  }

  if (forbidQualified) {
    return '`' + val.replace(/`/g, '``') + '`';
  }
  return '`' + val.replace(/`/g, '``').replace(/\./g, '`.`') + '`';
};

SqlString.escape = function(val, stringifyObjects, timeZone) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? 'true' : 'false';
    case 'number': return val+'';
  }

  if (val instanceof Date) {
    val = SqlString.dateToString(val, timeZone || 'local');
  }

  if (Buffer.isBuffer(val)) {
    return SqlString.bufferToString(val);
  }

  if (Array.isArray(val)) {
    return SqlString.arrayToList(val, timeZone);
  }

  if (typeof val === 'object') {
    if (stringifyObjects) {
      val = val.toString();
    } else {
      return SqlString.objectToValues(val, timeZone);
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

SqlString.arrayToList = function(array, timeZone) {
  return array.map(function(v) {
    if (Array.isArray(v)) return '(' + SqlString.arrayToList(v, timeZone) + ')';
    return SqlString.escape(v, true, timeZone);
  }).join(', ');
};

SqlString.format = function(sql, values, stringifyObjects, timeZone) {
  values = values == null ? [] : [].concat(values);

  var index = 0;
  return sql.replace(/\?\??/g, function(match) {
    if (index === values.length) {
      return match;
    }

    var value = values[index++];

    return match === '??'
      ? SqlString.escapeId(value)
      : SqlString.escape(value, stringifyObjects, timeZone);
  });
};

SqlString.dateToString = function dateToString(date, timeZone) {
  var dt = new Date(date);

  var year;
  var month;
  var day;
  var hour;
  var minute;
  var second;
  var millisecond;

  if (timeZone === 'local') {
    year        = dt.getFullYear();
    month       = dt.getMonth() + 1;
    day         = dt.getDate();
    hour        = dt.getHours();
    minute      = dt.getMinutes();
    second      = dt.getSeconds();
    millisecond = dt.getMilliseconds();
  } else {
    var tz = convertTimezone(timeZone);

    if (tz !== false && tz !== 0) {
      dt.setTime(dt.getTime() + (tz * 60000));
    }

    year       = dt.getUTCFullYear();
    month       = dt.getUTCMonth() + 1;
    day         = dt.getUTCDate();
    hour        = dt.getUTCHours();
    minute      = dt.getUTCMinutes();
    second      = dt.getUTCSeconds();
    millisecond = dt.getUTCMilliseconds();
  }

  // YYYY-MM-DD HH:mm:ss.mmm
  return zeroPad(year, 4) + '-' + zeroPad(month, 2) + '-' + zeroPad(day, 2) + ' ' +
    zeroPad(hour, 2) + ':' + zeroPad(minute, 2) + ':' + zeroPad(second, 2) + '.' +
    zeroPad(millisecond, 3);
};

SqlString.bufferToString = function bufferToString(buffer) {
  return "X'" + buffer.toString('hex') + "'";
};

SqlString.objectToValues = function(object, timeZone) {
  var values = [];
  for (var key in object) {
    var value = object[key];
    if(typeof value === 'function') {
      continue;
    }

    values.push(this.escapeId(key) + ' = ' + SqlString.escape(value, true, timeZone));
  }

  return values.join(', ');
};

function zeroPad(number, length) {
  number = number.toString();
  while (number.length < length) {
    number = '0' + number;
  }

  return number;
}

function convertTimezone(tz) {
  if (tz === 'Z') {
    return 0;
  }

  var m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/);
  if (m) {
    return (m[1] == '-' ? -1 : 1) * (parseInt(m[2], 10) + ((m[3] ? parseInt(m[3], 10) : 0) / 60)) * 60;
  }
  return false;
}
