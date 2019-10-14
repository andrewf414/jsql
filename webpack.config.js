const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'jsql.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'jsql'
  }
};