palette		;将要写入的调色板数据
	.HEX 3F 00 0F161630 0F3C1016 0F290927 0F001020 0F182738 0F0A1B3B 0F0C1020 0F041620 FF
helloWorld	;屏幕写入 HELLO WORLD 数据
	.DB $21, $25, "HELLO", $00, "WORLD", $FF
	
	.DWG help
		palette, helloWorld, helloWorld, helloWorld
	.ENDD