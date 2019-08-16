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
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.json']
      }
    }
  },
  overrides: [
    {
      files: ['examples/**/*.js'],
      rules: {
        'import/no-unresolved': 0,
        '@typescript-eslint/no-var-requires': 0
      }
    },
    {
      files: ['__tests__/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 0,
        '@typescript-eslint/explicit-function-return-type': 0,
        'spaced-comment': 0
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
    'no-console': 0,
    'import/prefer-default-export': 0,
    'lines-between-class-members': 0,
    '@typescript-eslint/ban-ts-ignore': 1,
    '@typescript-eslint/consistent-type-assertions': 1,
    '@typescript-eslint/no-inferrable-types': 1
  }
};
