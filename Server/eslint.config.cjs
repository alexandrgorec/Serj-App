// eslint.config.cjs
module.exports = [
  {
    files: ['**/*.js'],
    rules: {
      'no-unused-vars': ['warn', { 
        vars: 'all',              // Проверять все переменные, включая глобальные
        args: 'after-used',       // Проверять аргументы функций
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
];