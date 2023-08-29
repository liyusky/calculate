import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
export default {
	input: 'src/index.ts',
	output: {
		file: 'dist/index.js', // 输出文件
		format: 'iife',
		sourcemap: true,
		name: 'Location' // IIFE模块的名称
	},
	plugins: [
		commonjs(),
		nodeResolve(),
		typescript({
			sourceMap: true,
			target: "es5"
		})
	],
	watch: {
		buildDelay: 0,
		include: 'src/**',
		exclude: 'node_modules/**'
	}
};