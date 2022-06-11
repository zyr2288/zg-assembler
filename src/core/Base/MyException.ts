import { Token } from "./Token";
import { GlobalVar } from "./GlobalVar";

export enum ErrorLevel { AtLastShow, ShowAndBreak, Show }
export enum ErrorType {
	ExpressionError, UnknowOriginalAddress, UnSupportCommand, ArgumentCountError,
	ArgumentError, ArgumentOutofRange,
	LabelIllegal, LabelAlreadyDefined, NamelessLabelNotInMacro, LabelInMacroIllegal, UnknowLabel, MacroNameIllegal,
	MacroAlreadyDefined,
	InstructionNotSupportAddress,
	CommandNotSupportNested, CommandNotClosed, CommandParamsError, CommandNotInMacro, CommandNotSupportLabel,
	NotSupportString, OnlyOneString, StringError,
	FileIsNotExsist
}

const AllErrorMessage_en = [
	"Expression error", "Unknow original address", "Unsupport command", "Wrong arguments count",
	"Argument error", "Argument out of range",
	"Label is illegal", "Label is already defined", "Not support nameless label in Macro", "Sub-label do not supported in Macro", "Unknow label", "Macro name is illegal",
	"Macro is already defined",
	"Instruction do not support this addressing method",
	"Can not use Macro in Macro", ".ENDM not founded", "Incorrect Macro parameters", "Can not use Macro in Macro", "Macro do not support label",
	"String is too long", "Only one string is supported", "String error",
	"File is not exsist"
];

const AllErrorMessage_cn = [
	"表达式错误", "未设定编译起始地址", "不支持的编译器指令", "编译器指令参数错误",
	"参数错误", "参数越界",
	"标签定义错误", "标签已重复定义", "自定义函数内不支持临时标签", "在自定义函数内不支持包含子属性的标签", "未找到标签", "不允许使用汇编指令作为自定义函数名称",
	"已重复定义自定义函数",
	"汇编指令不支持该寻址方式",
	"命令不支持嵌套", "命令找不到配对结尾", "命令参数不正确", "该命令不允许在自定义函数内使用", "命令不支持标签",
	"不支持长度1以上的字符串", "只支持一个字符串", "字符串错误",
	"文件不存在"
];

export class MyException {
	/**key 文件的Hash */
	static fileErrors: { [key: number]: number[] } = {};
	/**key word的Key */
	static words: { [key: number]: ExceptionWords } = {};
	static ErrorMessages: string[] = AllErrorMessage_cn;
	static isError = false;

	static PushException(word: Token, errorType: ErrorType, level: ErrorLevel) {
		if (!GlobalVar.env.lastCompile && level == ErrorLevel.AtLastShow)
			return;

		let exception = new ExceptionWords(errorType, word);
		let hash = word.hashCode;
		if (!MyException.words[hash]) {
			MyException.words[hash] = exception;
			MyException.isError = true;
		}

		if (!MyException.fileErrors[word.fileHash]) {
			MyException.fileErrors[word.fileHash] = [];
		}

		if (!MyException.fileErrors[word.fileHash].includes(hash))
			MyException.fileErrors[word.fileHash].push(hash);
	}

	/**获取所有错误 */
	static GetAllException() {
		let result: { filePath: string; line: number; start: number; length: number; message: string; }[] = [];
		for (let key in MyException.words) {
			let error = MyException.words[key];
			let temp = {
				filePath: GlobalVar.env.GetFile(error.word.fileHash),
				line: error.word.lineNumber,
				start: error.word.startColumn,
				length: error.word.length,
				message: error.GetErrorMessage()
			}
			result.push(temp);
		}
		return result;
	}

	/**清除某个文件的所有错误 */
	static ClearFileError(fileHash: number) {
		if (!MyException.fileErrors[fileHash])
			return;

		let allErrors = MyException.fileErrors[fileHash];
		for (let i = 0; i < allErrors.length; i++)
			delete (MyException.words[allErrors[i]]);

		MyException.fileErrors[fileHash] = [];
	}

	/**清除所有错误 */
	static ClearAll() {
		MyException.words = {};
		MyException.fileErrors = {};
		MyException.isError = false;
	}

	static ChangeLanguage(language: string) {
		switch(language) {
			case "zh-cn":
				MyException.ErrorMessages = AllErrorMessage_cn;
				break;
			default:
				MyException.ErrorMessages = AllErrorMessage_en;
				break;
		}
	}
}

//#region 错误信息
export class ExceptionWords {
	word: Token;
	errorType: ErrorType;

	constructor(type: ErrorType, word: Token) {
		this.errorType = type;
		this.word = word;
	}

	public GetErrorMessage() {
		return MyException.ErrorMessages[this.errorType];
		// return `第${this.word.lineNumber}行, \"${this.word.text}\", ${AllErrorMessage[this.errorType]}`;
	}
}
//#endregion 错误信息