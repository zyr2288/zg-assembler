import { defineConfig, OutputOptions, RolldownOptions } from "rolldown";
import pakcage from "./package.json" with { type: "json" };
import { InlineEnvPlugin } from "./envPackage";

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
			plugins: [InlineEnvPlugin({ production })],
		}
	}

	const baseOption: RolldownOptions = {
		input: ["src/Core/ZGAssembler.ts"],
		output: {
			name: "ZGAssembler", entryFileNames: "",
			dir: "dist-core", format: "umd",
			minify: true, cleanDir: false, postBanner: banner, extend: true
		} as OutputOptions,

	};

	let output, allOptions: RolldownOptions[] = [];

	allOptions[0] = structuredClone(baseOption);
	output = allOptions[0].output as OutputOptions;
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;
	output.cleanDir = true;

	allOptions[1] = structuredClone(baseOption);
	output = allOptions[1].output as OutputOptions;
	output.format = "iife";
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;

	allOptions[2] = structuredClone(baseOption);
	output = allOptions[2].output as OutputOptions;
	output.format = "esm";
	output.entryFileNames = `[name]-${output.format}-v${pakcage.version}.js`;

	for (const option of allOptions) {
		option.plugins = [InlineEnvPlugin({ production })];
	}

	return allOptions;
});