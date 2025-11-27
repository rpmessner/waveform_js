import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const banner = `/**
 * waveform-js v${process.env.npm_package_version || '0.1.0'}
 * Web Audio transport layer for browser-based live coding
 * @license MIT
 */`;

export default [
  // UMD build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/waveform.js',
      format: 'umd',
      name: 'Waveform',
      banner,
      sourcemap: true,
      exports: 'named'
    },
    plugins: [resolve()]
  },
  // Minified UMD build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/waveform.min.js',
      format: 'umd',
      name: 'Waveform',
      banner,
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      terser({
        format: {
          comments: /^!/
        }
      })
    ]
  },
  // ES module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/waveform.esm.js',
      format: 'es',
      banner,
      sourcemap: true
    },
    plugins: [resolve()]
  }
];
