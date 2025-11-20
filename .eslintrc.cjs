// .eslintrc.cjs
module.exports = {
  globals: {
    ol: 'readonly',
    L: 'readonly'
  },
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    // aktifkan integrasi Prettier (kamu sudah install prettier + plugin-nya)
    'plugin:prettier/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-console': 'off', // boleh console pas dev
  },
  ignorePatterns: ['dist/**', 'node_modules/**'],
};
