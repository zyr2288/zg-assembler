export class Config {
	static readonly FileExtension = {
		scheme: "file",
		/**编译语言 */
		language: "zg-assembly",
		/**文件扩展名，无点 */
		extension: "asm",
	};
	/**Debug配置 */
	// static readonly DebugConfig = {
	// 	/**Debug类型 */
	// 	DebugType: "zg-assembly-debug",
	// 	DebugHost: "127.0.0.1",
	// 	DebugPort: 14000
	// }
	static readonly ConfigFile = "project-settings.json";
	static readonly CommonSplit = "/";
	static readonly ExtensionCommandNames = {
		/**显示标签树 */
		ShowLabelTree: "zg-assembly.showLabelTree",
		/**编译当前文件 */
		CompliteThis: "zg-assembly.compliteThis",
		/**编译主文件 */
		CompliteMain: "zg-assembly.compliteMain",
	}

	/**是项目还是单文件，true为项目 */
	static readonly InProject = true;

	static readonly ProjectDefaultSetting = {
		platform: "6502",
		intellisense: true,
		outOfRangeWarning: true,
		entry: "main.asm",
		compileTimes: 2,
		outputEntryFile: "",
		outputSingleFile: "",
		copyToClipboard: false,
		includes: ["**/*.asm"],
		excludes: [] as string[]
	}

	static ProjectSetting: typeof Config.ProjectDefaultSetting = {
		platform: "6502",
		intellisense: true,
		outOfRangeWarning: true,
		entry: "main.asm",
		compileTimes: 2,
		outputEntryFile: "",
		outputSingleFile: "",
		copyToClipboard: false,
		includes: ["**/*.asm"],
		excludes: [] as string[]
	}

	//#region 读取配置文件
	/**读取配置文件 */
	static ReadConfigJson(json: string) {
		Config.ProjectSetting = JSON.parse(json);

		if (typeof (Config.ProjectSetting.platform) !== "string")
			Config.ProjectSetting.platform = "6502";

		if (typeof (Config.ProjectSetting.intellisense) !== "boolean")
			Config.ProjectSetting.intellisense = true;

		if (typeof (Config.ProjectSetting.outOfRangeWarning) !== "boolean")
			Config.ProjectSetting.outOfRangeWarning = true;

		if (typeof (Config.ProjectSetting.entry) !== "string")
			Config.ProjectSetting.entry = "";

		if (typeof (Config.ProjectSetting.compileTimes) !== "number")
			Config.ProjectSetting.compileTimes = 2;

		if (typeof (Config.ProjectSetting.outputEntryFile) !== "string")
			Config.ProjectSetting.outputEntryFile = "";

		if (typeof (Config.ProjectSetting.outputSingleFile) !== "string")
			Config.ProjectSetting.outputSingleFile = "";

		if (typeof (Config.ProjectSetting.copyToClipboard) !== "boolean")
			Config.ProjectSetting.copyToClipboard = false;

		if (!(Config.ProjectSetting.includes instanceof Array)) {
			Config.ProjectSetting.includes = ["**/*.asm"];
		} else {
			let success = true;
			for (let i = 0; i < Config.ProjectSetting.includes.length; i++) {
				if (typeof (Config.ProjectSetting.includes[i]) === "string")
					continue;

				success = false;
			}
			if (!success)
				Config.ProjectSetting.includes = ["**/*.asm"];
		}

		if (!(Config.ProjectSetting.excludes instanceof Array)) {
			Config.ProjectSetting.excludes = [];
		} else {
			let success = true;
			for (let i = 0; i < Config.ProjectSetting.excludes.length; i++) {
				if (typeof (Config.ProjectSetting.excludes[i]) === "string")
					continue;

				success = false;
			}
			if (!success)
				Config.ProjectSetting.excludes = [];
		}
	}
	//#endregion 读取配置文件

}