var fs = require('fs');

exports.copy = function (in_path, out_path) {
  var assets = fs.readdirSync(in_path);

  for (var i = 0; i < assets.length; i++) {
    if (assets[i] == 'screen.styl') continue;

    fs.createReadStream(in_path + assets[i]).pipe(fs.createWriteStream(out_path + assets[i]));
  }
};
