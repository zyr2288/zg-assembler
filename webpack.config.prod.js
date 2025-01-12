//@ts-check

'use strict';

const path = require('path');
const packageJson = require("./package.json");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const buildCore = "dist-core";

/** @type WebpackConfig */
const coreBuilderCS = {
	target: ["web", "es2020"],
	mode: "production",
	entry: "./src/Core/ZGAssembler.ts",
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, buildCore),
		filename: `core-cs-${packageJson.version}.js`,
		library: { name: "zgassembler", type: "var", export: "ZGAssembler" },
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
				use: [{
					loader: 'ts-loader',
					options: {
						configFile: "tsconfig.cs.json"
					}
				}]
			}
		]
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
}

/** @type WebpackConfig */
const coreBuilderNode = {
	target: "node",
	mode: "production",
	entry: "./src/Core/ZGAssembler.ts",
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, buildCore),
		filename: `core-nodejs-${packageJson.version}.js`,
		library: { name: "zgassembler", type: "commonjs2", export: "ZGAssembler" },
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
				use: [{
					loader: 'ts-loader',
					options: {
						configFile: "tsconfig.node.json"
					}
				}]
			}
		]
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
}

/** @type WebpackConfig */
const coreBuilderES6 = {
	target: ["web"],
	mode: "production",
	entry: "./src/Core/ZGAssembler.ts",
	output: {
		// the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, buildCore),
		filename: `core-web-${packageJson.version}.js`,
		library: { name: "ZGAssembler", type: "window", export: "ZGAssembler" },
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
				use: [{
					loader: 'ts-loader',
					options: {
						configFile: "tsconfig.node.json"
					}
				}]
			}
		]
	},
	devtool: 'nosources-source-map',
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
}

module.exports = [
	coreBuilderCS, coreBuilderNode, coreBuilderES6
];