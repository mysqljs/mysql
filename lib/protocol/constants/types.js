// Manually extracted from mysql-5.5.23/include/mysql_com.h
// some more info here: http://dev.mysql.com/doc/refman/5.5/en/c-api-prepared-statement-type-codes.html
exports.MYSQL_DECIMAL     = 0x00; // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
exports.MYSQL_TINY        = 0x01; // aka TINYINT, 1 byte
exports.MYSQL_SHORT       = 0x02; // aka SMALLINT, 2 bytes
exports.MYSQL_LONG        = 0x03; // aka INT, 4 bytes
exports.MYSQL_FLOAT       = 0x04; // aka FLOAT, 4-8 bytes
exports.MYSQL_DOUBLE      = 0x05; // aka DOUBLE, 8 bytes
exports.MYSQL_NULL        = 0x06; // NULL (used for prepared statements, I think)
exports.MYSQL_TIMESTAMP   = 0x07; // aka TIMESTAMP
exports.MYSQL_LONGLONG    = 0x08; // aka BIGINT, 8 bytes
exports.MYSQL_INT24       = 0x09; // aka MEDIUMINT, 3 bytes
exports.MYSQL_DATE        = 0x0a; // aka DATE
exports.MYSQL_TIME        = 0x0b; // aka TIME
exports.MYSQL_DATETIME    = 0x0c; // aka DATETIME
exports.MYSQL_YEAR        = 0x0d; // aka YEAR, 1 byte (don't ask)
exports.MYSQL_NEWDATE     = 0x0e; // aka ?
exports.MYSQL_VARCHAR     = 0x0f; // aka VARCHAR (?)
exports.MYSQL_BIT         = 0x10; // aka BIT, 1-8 byte
exports.MYSQL_NEWDECIMAL  = 0xf6; // aka DECIMAL
exports.MYSQL_ENUM        = 0xf7; // aka ENUM
exports.MYSQL_SET         = 0xf8; // aka SET
exports.MYSQL_TINY_BLOB   = 0xf9; // aka TINYBLOB, TINYTEXT
exports.MYSQL_MEDIUM_BLOB = 0xfa; // aka MEDIUMBLOB, MEDIUMTEXT
exports.MYSQL_LONG_BLOB   = 0xfb; // aka LONGBLOG, LONGTEXT
exports.MYSQL_BLOB        = 0xfc; // aka BLOB, TEXT
exports.MYSQL_VAR_STRING  = 0xfd; // aka VARCHAR, VARBINARY
exports.MYSQL_STRING      = 0xfe; // aka CHAR, BINARY
exports.MYSQL_GEOMETRY    = 0xff; // aka GEOMETRY

exports.JS_STRING           = 1;
exports.JS_DATE             = 2;
exports.JS_NUMBER           = 3;
exports.JS_BUFFER           = 4;
exports.JS_BUFFER_OR_STRING = 5; 

var castMap = {};

castMap[exports.MYSQL_TIMESTAMP]   = exports.JS_DATE;
castMap[exports.MYSQL_DATE]        = exports.JS_DATE;
castMap[exports.MYSQL_DATETIME]    = exports.JS_DATE;
castMap[exports.MYSQL_NEWDATE]     = exports.JS_DATE;
castMap[exports.MYSQL_TINY]        = exports.JS_NUMBER;
castMap[exports.MYSQL_SHORT]       = exports.JS_NUMBER;
castMap[exports.MYSQL_LONG]        = exports.JS_NUMBER;
castMap[exports.MYSQL_INT24]       = exports.JS_NUMBER;
castMap[exports.MYSQL_YEAR]        = exports.JS_NUMBER;
castMap[exports.MYSQL_FLOAT]       = exports.JS_NUMBER;
castMap[exports.MYSQL_DOUBLE]      = exports.JS_NUMBER;
castMap[exports.MYSQL_BIT]         = exports.JS_BUFFER;
castMap[exports.MYSQL_STRING]      = exports.JS_BUFFER_OR_STRING;
castMap[exports.MYSQL_VAR_STRING]  = exports.JS_BUFFER_OR_STRING;
castMap[exports.MYSQL_TINY_BLOB]   = exports.JS_BUFFER_OR_STRING;
castMap[exports.MYSQL_MEDIUM_BLOB] = exports.JS_BUFFER_OR_STRING;
castMap[exports.MYSQL_LONG_BLOB]   = exports.JS_BUFFER_OR_STRING;
castMap[exports.MYSQL_BLOB]        = exports.JS_BUFFER_OR_STRING;

exports.DEFAULT_CAST_MAP = castMap;
