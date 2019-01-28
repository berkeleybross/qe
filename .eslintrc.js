module.exports = {
    root: true,
    parserOptions: {
      ecmaVersion: 2018,
      sourceType: 'module'
    },
    env: { browser: true, node: true },
    extends: ['plugin:prettier/recommended'],
    plugins: [],
    globals: {},
    rules: {
      // This claims to be the default, but doesn't currently enforce without it be explicitly set.
      quotes: ['error', 'single', { avoidEscape: true }]
    }
  }
