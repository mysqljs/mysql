#!/usr/bin/env node
var fs   = require('fs');
var path = require('path');

var changesFilePath     = path.join(__dirname, '..', 'Changes.md');
var changesFileContents = fs.readFileSync(changesFilePath, 'utf-8');
var changesHeadRegexp   = /^## HEAD$/m;
var date                = getLocaleDate();
var version             = process.env.npm_package_version;

if (!changesHeadRegexp.test(changesFileContents)) {
  console.error('Changes.md missing version marker.');
  process.exit(1);
}

fs.writeFileSync(changesFilePath,
  changesFileContents.replace(changesHeadRegexp, '## v' + version + ' (' + date + ')'));

function getLocaleDate() {
  var now = new Date();

  return zeroPad(now.getFullYear(), 4) + '-' +
    zeroPad(now.getMonth() + 1, 2) + '-' +
    zeroPad(now.getDate(), 2);
}

function zeroPad(number, length) {
  number = number.toString();

  while (number.length < length) {
    number = '0' + number;
  }

  return number;
}
