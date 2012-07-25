var options = {};

if (process.env.filter) {
  options.include = new RegExp(process.env.filter + '.*\\.js$');
}

require('urun')(__dirname, options);
