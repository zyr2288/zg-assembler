import { defineConfig, RolldownOptions } from "rolldown";
import pakcage from "./package.json" with { type: "json" };

export default defineConfig((env) => {

	const production = env.production === "true";
	const buildCore = env.buildCore === "true";

	const banner = `/**\n * ZG Assembler v${pakcage.version}\n */`;
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
		name: "ZGAssembler",
		entryFileNames: `[name]-iife-v${pakcage.version}.js`,
		dir: "dist-core",
		globals: { ZGAssembler: "ZGAssembler" },
		format: "iife",
		minify: true,
		cleanDir: true,
		postBanner: banner,
	}
	return options;
});