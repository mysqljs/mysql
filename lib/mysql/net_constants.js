// Constants have been changing through various node versions.
// First we try to look for them in the old location (in the net binding)
// If this fails, we try to get them from the constants module which
// was added in a later version. If that fails we raise an error;

var NET_CONSTANTS_NOT_FOUND = 'Unable to detect constants location, please report this.';

module.exports = process.binding('net');

if ('ECONNREFUSED' in module.exports) {
  return;
}

try {
  module.exports = require('constants');
} catch (e) {
  throw new Error(NET_CONSTANTS_NOT_FOUND);
}

if (!('ECONNREFUSED' in module.exports)) {
  throw new Error(NET_CONSTANTS_NOT_FOUND);
}
