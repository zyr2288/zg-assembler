{
	function OpenExpr(left, right) {
    	if (left.length == 0)
        	return left;
            
    	let temp = right.reduce((result, element) => {
        	let t = [result];
        	for(let i = 0;i < element.length; ++i)
            	if (element[i] && element[i].trim() != "")
                    t.push(element[i]);
                
			return t;
        }, left);
        return temp;
	}
}

Program = CommandsLine*

// 所有行
CommandsLine = Command_DX
LabelLine = Label?

// 允许标签的命令
Commands = ".DB"i / ".DW"i
Command_DX = Label? WhiteSpace? (".DB"i / ".DW"i / ".DL"i) WhiteSpace Expression LineEnd?

// 标签
Label = &Commands / LocalLabel / GlobalLabel / TempLabel

TempLabel = ("+" / "-")+ { return text() }
LocalLabel = label:("."LabelString) ":"? { return label.join("") }
GlobalLabel = label:LabelString ":"? { return label }

// 基础字符
LabelString = [^0-9$@\n\r\t \+\-\*\/&|!^.][^$@\n\r\t \+\-\*\/&|!^.]* { return text() }
WhiteSpace = [ \t\v\f\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]+ { return text() }
EndOfLine = "\n" / "\r\n" / "\r" / "\u2028" / "\u2029"+ { return text() }

Comment = ";"[+-]?comment:[^\n\r\u2028\u2029]* { return comment.join("") }
EndOfInput = &.

Binary = "@"[01]+ { return bin.join("") }
Decimal = [0-9]+("."[0-9]+)? { return text() }
Hex = "$"hex:[0-9a-fA-F]+ { return hex.join("") }
Number = Binary / Decimal / Hex

EndOrSpace = WhiteSpace / EndOfLine
LineEnd = EndOfLine / Comment

// 运算符
Expression = left:Operator_AndAnd right:(WhiteSpace? "||" WhiteSpace? Operator_AndAnd)* { return OpenExpr(left, right) }
Operator_AndAnd = left:Operation_Or right:(WhiteSpace? "&&" WhiteSpace? Operation_Or)* { return OpenExpr(left, right) }
Operation_Or =  left:Operation_EOR right:(WhiteSpace? "|" WhiteSpace? Operation_EOR)* { return OpenExpr(left, right) }
Operation_EOR = left:Operation_And right:(WhiteSpace? "^" WhiteSpace? Operation_And)* { return OpenExpr(left, right) }
Operation_And = left:Operation_EqualOrNot right:(WhiteSpace? "^" WhiteSpace? Operation_EqualOrNot)* { return OpenExpr(left, right) }
Operation_EqualOrNot = left:Operation_LargerOrSmaller right:(WhiteSpace? ("==" / "!=") WhiteSpace? Operation_LargerOrSmaller)* { return OpenExpr(left, right) }
Operation_LargerOrSmaller = left:Operation_Move right:(WhiteSpace? (">" / ">=" / "<" / "<=") WhiteSpace? Operation_Move)* { return OpenExpr(left, right) }
Operation_Move = left:Operation_PlusOrMinuse right:(WhiteSpace? (">>" / "<<") WhiteSpace? Operation_PlusOrMinuse)* { return OpenExpr(left, right) }
Operation_PlusOrMinuse = left:Operation_Times right:(WhiteSpace? ("+" / "-") WhiteSpace? Operation_Times)* { return OpenExpr(left, right) }
Operation_Times = left:Operation_Bracket right:(WhiteSpace? ("*" / "/" / "%") WhiteSpace? Operation_Bracket)* { return OpenExpr(left, right) }
Operation_Bracket = "(" WhiteSpace? expr:Expression WhiteSpace? ")" { return expr; } / Number / LocalLabel / GlobalLabel