import { defineConfig, RolldownOptions } from "rolldown";
import pakcage from "./package.json" with { type: "json" };

export default defineConfig((env) => {

	let production = env.production === "true";
	let buildCore = env.buildCore === "true";

	let banner = `/**\n * ZG Assembler v${pakcage.version}\n */`;
	const options: RolldownOptions = {};

	// vscode插件
	if (!buildCore) {
		options.input = ["src/extension.ts", "src/Core/ZGAssembler.ts", "src/Plugin"];
		options.output = {
			dir: "dist",
			format: "cjs",
			minify: production,
			cleanDir: true,
			postBanner: banner,
		}
		options.external = ["vscode"];
		return options;
	}

	// 编译成外部核心库
	options.input = ["src/Core/ZGAssembler.ts"];
	options.output = {
		dir: "dist-core",
		name: "ZGAssembler",
		globals: {
			ZGAssembler: "ZGAssembler"
		},
		format: "iife",
		minify: true,
		cleanDir: true,
		postBanner: banner,
	}
	return options;
});