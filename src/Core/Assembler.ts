import { Compiler } from "./Base/Compiler";
import { Config } from "./Base/Config";
import { MyException } from "./Base/MyException";

export class Assembler {
	compiler = Compiler;
	exceptions = MyException;
	config = Config;
}