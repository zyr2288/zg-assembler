// @ts-ignore
import * as fs from "node:fs";
// @ts-ignore
import * as path from "node:path";

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

export function InlineEnvPlugin(options = {}) {
	return {
		name: "proccess-env",
		buildStart() {
			const full = path.resolve(process.cwd(), envPath);
			if (!fs.existsSync(full)) {
				this.warn(`[inline-env] ${envPath} not found; no replacements from file${fallbackToProcessEnv ? ' (process.env may still be used as fallback)' : ''}.`);
				envVars = {};
				return;
			}
			const content = fs.readFileSync(full, 'utf8');
			const parsed = ParseDotEnv(content);

			// 合并 process.env（可选回退）
			const combined = Object.assign({}, fallbackToProcessEnv ? process.env : {}, parsed);

			// 过滤：whitelist > prefix > 全部
			const keys = whitelist ? Object.keys(combined).filter(k => whitelist.includes(k))
				: prefix ? Object.keys(combined).filter(k => k.startsWith(prefix))
					: Object.keys(combined);

			envVars = keys.reduce((o, k) => {
				o[k] = combined[k];
				return o;
			}, {});
			this.info(`[inline-env] will inline ${Object.keys(envVars).length} env vars${prefix ? ` (prefix=${prefix})` : ''}${whitelist ? ` (whitelist)` : ''}.`);
		},

		transform(code, id) {
			// 跳过 node_modules（通常不需要替换第三方代码）
			if (id.includes('node_modules')) return null;

			// 仅匹配静态形式 process.env.KEY，避免 process.env['KEY'] / dynamic 访问
			// 额外用负向先行断言避免替换赋值左值 (preventAssignment 类似)
			const regex = /\bprocess\.env\.([A-Za-z0-9_]+)\b(?!\s*=)/g;

			let found = false;
			const transformed = code.replace(regex, (match, p1) => {
				if (Object.prototype.hasOwnProperty.call(envVars, p1)) {
					found = true;
					return JSON.stringify(envVars[p1]);
				}
				return match;
			});

			if (found) {
				// 返回新的 code。这里不生成 source map（简单实现），Rollup 会尝试生成整体 sourcemap。
				return { code: transformed, map: null };
			}
			return null;
		}
	};
}