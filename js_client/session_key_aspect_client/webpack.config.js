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
  // 其他配置...
};
