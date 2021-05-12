module.exports = {
  context: __dirname,
  entry: './components/router.jsx',
  output: {
    path: `${__dirname}/app/`,
    filename: 'bundle.js',
    publicPath: 'https://localhost:7700/',
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel',
        query:
        {
          presets: ['react', 'es2015', 'stage-0'],
        },
        exclude: [
          /node_modules/,
          /\.spec.jsx?$/,
        ],
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
    ],
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
  },
  devtool: 'cheap-module-eval-source-map',
  devServer: {
    hot: true,
    inline: true,
    port: 7700,
    historyApiFallback: true,
  },
}
