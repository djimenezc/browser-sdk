'use strict';

module.exports = function (api) {
  api.cache(true);
  const presets = ['@babel/preset-env'];
  const plugins = [
    [
      '@babel/plugin-transform-runtime',
      {
        'corejs': false,
        'helpers': true,
        'regenerator': true,
        'useESModules': false
      }
    ]
  ];

  return {
    presets,
    plugins,
    sourceType: 'unambiguous'
  };
};
