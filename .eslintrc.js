module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: false,
    node: true,
    commonjs: true,
    es6: true,
    'jest/globals': true
  },
  extends: ['plugin:@typescript-eslint/recommended', 'airbnb-base', 'prettier', 'prettier/@typescript-eslint'],
  plugins: ['prettier', 'jest'],
  overrides: [
    {
      files: ['examples/**/*.js'],
      rules: {
        'import/no-unresolved': 0
      }
    }
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-underscore-dangle': 0,
    'no-restricted-syntax': 0,
    radix: 0,
    'no-await-in-loop': 0,
    'no-plusplus': 0,
    'no-new': 0,
    'no-continue': 0,
    'max-classes-per-file': 0,
    'no-console': 0
  }
};
