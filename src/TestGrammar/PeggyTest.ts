import * as peggy from "peggy";

const Grammar = `
Commands = (".ORG" / ".BASE") Space Number WhiteSpace

WhiteSpace = (Space / EndLine / Comment)+

Space = [ \\t]+ { return " "; }
EndLine = "\\r"?"\\n"+ { return "\\n"; }

Binary = "@" bin:[01]+ { return parseInt(bin.join(""), 2); }
Decimal = [0-9]+
Hex = "$" hex:[0-9a-fA-F]+ { return parseInt(hex.join(""), 16); }

Number = Binary / Decimal / Hex

Add = "+"

Comment = ";" [+-]? comment:(.*) "\\r"?" \\n"? { return comment.join(""); }
`;

export class PeggyTest {
	static Test(input: string) {
		var temp = peggy.generate(Grammar);
		var out = temp.parse(input, {
			tracer: {
				trace(test) {
					console.log(test);
				}
			}
		});
		console.log(out);
	}
}