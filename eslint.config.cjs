const globals = require('globals');
const js = require("@eslint/js");
const pluginPromise = require('eslint-plugin-promise');
const pluginHtml = require('eslint-plugin-html');

module.exports = [
  {
    ignores: ['node_modules/**', '.DS_Store'],
  },
  js.configs.recommended,
  pluginPromise.configs['flat/recommended'],
  {
    files: ['**/*.html'],
    plugins: {
      html: pluginHtml,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        Alpine: 'readonly',
        $: 'readonly',
        $data: 'readonly',
        $store: 'readonly',
        $refs: 'readonly',
      },
    },
    rules: {
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'max-len': ['error', { code: 120 }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'max-len': ['error', { code: 120 }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
