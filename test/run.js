var options = {};

if (process.env.FILTER) {
  options.include = new RegExp(process.env.FILTER + '.*\\.js$');
}

require('urun')(__dirname, options);
