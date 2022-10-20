import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const outputDir = 'dist';

const configs = [
  {
    input: './lib/index.js',
    output: {
      file: `${outputDir}/index.js`,
      format: 'cjs',
      exports: 'named'
    },
    plugins: pgl()
  }
];

export default configs;


// helpers //////////////////////

function pgl(plugins = []) {
  return [
    nodeResolve({
      mainFields: [
        'module',
        'main'
      ]
    }),
    commonjs(),
    ...plugins
  ];
}