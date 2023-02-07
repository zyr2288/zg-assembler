Program = LabelLine EndOfInput

LabelLine = Label Comment EndOfLine

// 标签
Label = (TempLabel / LocalLabel / GlobalLabel) WhiteSpace* { return text() }

TempLabel = ("+" / "-")+
LocalLabel = ("."Char)+
GlobalLabel = Char

// 基础字符
Char = [^\r\n\t ()\[\]{}\+\-\*\/&|^;]+
WhiteSpace =  [ \t\v\f\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000] { return text(); }
EndOfLine = "\n" / "\r\n" / "\r" / "\u2028" / "\u2029"

Comment = ";"[+-]?comment:[^\n\r\u2028\u2029]* { return comment.join(""); }
EndOfInput = !.

Binary = "@"bin:[01]+ EndOrSpace { return bin.join(""); }
Decimal = [0-9]+("."[0-9]+)? EndOrSpace
Hex = "$"hex:[0-9a-fA-F]+ EndOrSpace { return hex.join(""); }
Number = Binary / Decimal / Hex

EndOrSpace = WhiteSpace / EndOfLine

// 运算符
Expression = left:Operator_AndAnd right:(WhiteSpace? "||" WhiteSpace? Operator_AndAnd)* { return OpenExpr(left, right); }
Operator_AndAnd = left:Operation_Or right:(WhiteSpace? "&&" WhiteSpace? Operation_Or)* { return OpenExpr(left, right); }
Operation_Or =  left:Operation_EOR right:(WhiteSpace? "|" WhiteSpace? Operation_EOR)* { return OpenExpr(left, right); }
Operation_EOR = left:Operation_And right:(WhiteSpace? "^" WhiteSpace? Operation_And)* { return OpenExpr(left, right); }
Operation_And = left:Operation_EqualOrNot right:(WhiteSpace? "^" WhiteSpace? Operation_EqualOrNot)* { return OpenExpr(left, right); }
Operation_EqualOrNot = left:Operation_LargerOrSmaller right:(WhiteSpace? ("==" / "!=") WhiteSpace? Operation_LargerOrSmaller)* { return OpenExpr(left, right); }
Operation_LargerOrSmaller = left:Operation_Move right:(WhiteSpace? (">" / ">=" / "<" / "<=") WhiteSpace? Operation_Move)* { return OpenExpr(left, right); }
Operation_Move = left:Operation_PlusOrMinuse right:(WhiteSpace? (">>" / "<<") WhiteSpace? Operation_PlusOrMinuse)* { return OpenExpr(left, right); }
Operation_PlusOrMinuse = left:Operation_Times right:(WhiteSpace? ("+" / "-") WhiteSpace? Operation_Times)* { return OpenExpr(left, right); }
Operation_Times = left:Operation_Bracket right:(WhiteSpace? ("*" / "/" / "%") WhiteSpace? Operation_Bracket)* { return OpenExpr(left, right); }
Operation_Bracket = "(" WhiteSpace? expr:Expression WhiteSpace? ")" { return expr; } / Number