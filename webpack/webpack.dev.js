'use strict';

const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.config');
const express = require('express');

module.exports = merge(baseConfig, {
  entry: {
    'query-bundle.js': path.join(__dirname, '..', 'lib', 'index.js'),
    'examples': path.join(__dirname, '..', 'examples', 'index.js')
  },
  devServer: {
    // publicPath: '/',
    // historyApiFallback: true,
    // contentBase: path.join(__dirname, '..', 'ex'),
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
