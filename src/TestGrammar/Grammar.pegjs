{
	function OpenExpr(left, right) {
    	if (left.length == 0)
        	return left;
            
    	let temp = right.reduce((result, element) => {
        	let t = [result];
        	for(let i = 0;i < element.length; ++i)
            	if (element[i] && element[i].trim() != "") t.push(element[i]);
			return t;
        }, left);
        return temp;
	}
}

CommandLine = (CommandExpr End)+

Comment = ";"[+-]?comment:(!End.)* &End { return text(); }

CommandExpr = Label? Commands Space (Expression / TempLabel) WhiteSpace Comment?

Label = &Commands / LobalLabel / GlobalLabel
GlobalLabel = Char+ { return text(); }
LobalLabel = ("."Char)+ { return text(); }
TempLabel = ("+"+ / "-"+) { return text(); }

WhiteSpace = (EndLine / Space)* { return text(); }

Space = [ \t]+ { return text(); }

End = EndLine / EndFile
EndLine = "\r\n" / "\n" / "\r"
EndFile = !.

Binary = "@"bin:[01]+ { return parseInt(bin.join(""), 2); }
Decimal = [0-9]+("."[0-9]+)? { return text(); }
Hex = "$"hex:[0-9a-fA-F]+ { return parseInt(hex.join(""), 16); }
Number = Binary / Decimal / Hex


// 命令有表达式的
Commands = Space? command:(".ORG"i / ".BASE"i) { return command; }

Char = [^\r\n\t ()\[\]{}\+\-\*\/&|^;]+

Expression = left:Operator_AndAnd right:(Space? "||" Space? Operator_AndAnd)* { return OpenExpr(left, right); }
Operator_AndAnd = left:Operation_Or right:(Space? "&&" Space? Operation_Or)* { return OpenExpr(left, right); }
Operation_Or =  left:Operation_EOR right:(Space? "|" Space? Operation_EOR)* { return OpenExpr(left, right); }
Operation_EOR = left:Operation_And right:(Space? "^" Space? Operation_And)* { return OpenExpr(left, right); }
Operation_And = left:Operation_EqualOrNot right:(Space? "^" Space? Operation_EqualOrNot)* { return OpenExpr(left, right); }
Operation_EqualOrNot = left:Operation_LargerOrSmaller right:(Space? ("==" / "!=") Space? Operation_LargerOrSmaller)* { return OpenExpr(left, right); }
Operation_LargerOrSmaller = left:Operation_Move right:(Space? (">" / ">=" / "<" / "<=") Space? Operation_Move)* { return OpenExpr(left, right); }
Operation_Move = left:Operation_PlusOrMinuse right:(Space? (">>" / "<<") Space? Operation_PlusOrMinuse)* { return OpenExpr(left, right); }
Operation_PlusOrMinuse = left:Operation_Times right:(Space? ("+" / "-") Space? Operation_Times)* { return OpenExpr(left, right); }
Operation_Times = left:Operation_Bracket right:(Space? ("*" / "/" / "%") Space? Operation_Bracket)* { return OpenExpr(left, right); }
Operation_Bracket = "(" Space? expr:Expression Space? ")" { return expr; } / Number / Label
