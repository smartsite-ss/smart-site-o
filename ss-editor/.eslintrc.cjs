// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  rules: {
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': ['warn', { types: { Function: 'Avoid using the `Function` type.', '{}' : 'Avoid using `{}` as a type.' }, extendDefaults: true }],
    '@typescript-eslint/prefer-as-const': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-mutating-props': 'off',
    'vue/no-unused-vars': ['warn', { ignorePattern: '^_' }],
    'vue/no-v-html': 'off',
    'vue/require-default-prop': 'off',
    'vue/one-component-per-file': 'off',
    'vue/prop-name-casing': 'off',
    'no-case-declarations': 'off',
    'no-prototype-builtins': 'warn',
    'no-undef': 'off',
    'no-useless-escape': 'warn',
  },
  ignorePatterns: ['dist/**', 'node_modules/**', '*.d.ts'],
};