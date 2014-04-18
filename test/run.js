var options = {};

if (process.env.FILTER) {
  options.include = new RegExp(process.env.FILTER + '.*\\.js$');
}

options.reporter = 'BashTapReporter';

require('urun')(__dirname, options);
