module.exports = function(wallaby) {
  return {
    files: ['src/**/*.js', { pattern: 'src/**/*.test.js', ignore: true }],

    tests: ['src/**/*.test.js'],

    env: {
      type: 'node',
      runner: 'node'
    },

    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },

    testFramework: 'jest'
  }
}
