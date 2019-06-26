'use strict';

const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.config');
const express = require('express');

module.exports = merge(baseConfig, {
  entry: {
    // 'query-bundle': path.join(__dirname, '..', 'lib', 'index.js'),
    'examples': path.join(__dirname, '..', 'examples', 'index.js')
  },
  output: {
    library: 'examples',
    libraryTarget: 'umd',
    filename: '[name].js',
  },
  resolve: {
    alias: {
      '@devo/browser-sdk': path.resolve(__dirname, '..', 'lib', 'index.js')
    }
  },
  devServer: {
    // publicPath: '/',
    // historyApiFallback: true,
    contentBase: path.join(__dirname, '..', 'examples'),
    compress: true,
    port: 3001,
    before(app) {

    },
    stats: {
      assets: true,
      children: false,
      chunks: false,
      hash: true,
      modules: false,
      publicPath: false,
      timings: true,
      version: false,
      warnings: true
    }
  }
});
