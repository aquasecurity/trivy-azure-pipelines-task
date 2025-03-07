const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env) => ({
  entry: './src/index.tsx',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      'azure-devops-extension-sdk': path.resolve(
        'node_modules/azure-devops-extension-sdk'
      ),
    },
  },
  stats: {
    warnings: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/inline',
      },
      {
        test: /\.html$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: '**/*.html', context: 'public' }],
    }),
  ],
  ...(env.WEBPACK_SERVE
    ? {
        devtool: 'inline-source-map',
        devServer: {
          server: 'https',
          port: 3000,
        },
      }
    : {}),
});
