//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const coreBuilder = {
	target: "node",
	mode: "production",
	entry: ["./src/Core/Assembler.ts"],
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, "dist"),
		filename: "core.js",
		library: { name: "zgassembler", type: "commonjs", export: "Assembler" }
	},
	externals: {
		vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
		// modules added here also need to be added in the .vscodeignore file
	},
	resolve: {
		// support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [{ loader: 'ts-loader' }]
			}
		]
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
}

module.exports = [coreBuilder];