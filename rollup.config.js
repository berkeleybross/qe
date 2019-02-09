import sourceMaps from 'rollup-plugin-sourcemaps'
import babel from 'rollup-plugin-babel'

const pkg = require('./package.json')

export default {
  input: 'src/index.js',
  output: [{ file: pkg.module, format: 'cjs', sourcemap: true }],

  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: 'src/**'
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),

    // Resolve source maps to the original source
    sourceMaps()
  ]
}
