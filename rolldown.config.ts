import { defineConfig, OutputOptions, RolldownOptions } from "rolldown";
import pakcage from "./package.json" with { type: "json" };

export default defineConfig((env): RolldownOptions | RolldownOptions[] => {

	const production = env.production === "true";
	const buildCore = env.buildCore === "true";

	const banner = `/**\n * ZG Assembler v${pakcage.version}\n * © 2022-present, ZENG GE\n * License MIT\n */`;

	// vscode插件
	if (!buildCore) {
		return {
			input: ["src/extension.ts", "src/Core/ZGAssembler.ts", "src/Plugin"],
			output: {
				dir: "dist", format: "cjs",
				minify: production, cleanDir: true,
				postBanner: banner, sourcemap: !production,
			},
			external: ["vscode", "@vscode/debugadapter"],
		}
	}

	const baseOption: RolldownOptions = {
		input: ["src/Core/ZGAssembler.ts"],
		output: {
			name: "ZGAssembler", entryFileNames: "",
			dir: "dist-core", format: "umd",
			minify: true, cleanDir: false, postBanner: banner,
			extend: true
		} as OutputOptions,
	};

	let output;

	const option1 = structuredClone(baseOption);
	output = option1.output as OutputOptions;
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;
	output.cleanDir = true;

	const option2 = structuredClone(baseOption);
	output = option2.output as OutputOptions;
	output.format = "iife";
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;

	const option3 = structuredClone(baseOption);
	output = option3.output as OutputOptions;
	output.format = "esm";
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;

	return [option1, option2, option3];
});