var path = require('path');
var node_modules_dir = path.resolve(__dirname, 'node_modules');

var config = {
  entry: path.resolve(__dirname, 'src/js/app.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,

      // There is not need to run the loader through
      // vendors
      exclude: [node_modules_dir],
      loader: 'babel'
    }]
  }
};

module.exports = config;
