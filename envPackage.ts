// @ts-ignore
import * as fs from "node:fs";
// @ts-ignore
import * as path from "node:path";

declare var process: any;

function ParseDotEnv(content: string) {
	const lines = content.split(/\r?\n/);
	const env: Record<string, string> = {};
	for (let line of lines) {
		line = line.trim();

		// 如果是注释或空行则跳过
		if (!line || line.startsWith('#'))
			continue;

		const eqIdx = line.indexOf('=');
		if (eqIdx === -1)
			continue;

		const key = line.slice(0, eqIdx).trim();
		env[key] = line.slice(eqIdx + 1).trim();
	}
	return env;
}

export function InlineEnvPlugin(options: { production: boolean }) {
	let envVars: Record<string, string> = {};
	let envPath = options.production ? ".env.production" : ".env.development";
	return {
		name: "proccess-env",
		buildStart() {
			const full = path.resolve(process.cwd(), envPath);
			if (!fs.existsSync(full)) {
				console.warn("尚未找到配置文件");
				return;
			}
			const content = fs.readFileSync(full, "utf8");
			envVars = ParseDotEnv(content);
		},

		transform(code: string, id: string) {
			// 跳过 node_modules（通常不需要替换第三方代码）
			if (id.includes("node_modules"))
				return null;

			// 匹配所有的 process.env.ZGAssembler_ 开头的变量
			const regex = /\bprocess\.env\.(?<name>ZGAssembler_([A-Za-z0-9_]+)\b)/g;

			let found = false;
			const transformed = code.replaceAll(regex, (match, p1) => {
				if (envVars[p1]) {
					found = true;
					return `"${envVars[p1]}"`;
				}
				return match;
			});

			// 返回新的 code。这里不生成 source map（简单实现），Rollup 会尝试生成整体 sourcemap。
			if (found)
				return { code: transformed, map: null };

			return null;
		}
	};
}