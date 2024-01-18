const path = require('path');

module.exports = {
  entry: './index.js', 
  output: {
    path: path.resolve("./", 'dist'),
    filename: 'sessioin-key-aspect-client.bundle.js',
    library: 'sessioin-key-aspect-client',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  resolve: {
    fallback: {
      events: false,
      abc: false, // do not include a polyfill for abc
      xyz: path.resolve(__dirname, 'path/to/file.js'), // include a polyfill for xyz
    },
  },
  // 其他配置...
};
