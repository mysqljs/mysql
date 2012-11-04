var stylus = require('stylus');
var nib    = require('nib');
var fs     = require('fs');

exports.build = function (styl_path, css_path) {
  stylus(fs.readFileSync(styl_path).toString()).use(nib()).render(function (err, css) {
    if (err) throw err;

    fs.writeFileSync(css_path, css);
  });
};
