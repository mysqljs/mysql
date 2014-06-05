var urun = require('urun');

var options = {};

if (process.env.FILTER) {
  options.include = new RegExp(process.env.FILTER + '.*\\.js$');
}

options.reporter = 'BashTapReporter';
options.verbose  = process.env.VERBOSE
  ? Boolean(JSON.parse(process.env.VERBOSE))
  : true;

urun(__dirname, options);
