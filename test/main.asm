	.DEF prgRomPage, 1
	.DEF chrRomPage, 1

	.DEF mapper, 0
	.DEF fourScreen, 0 << 2		;四分屏幕，1为开启
	.DEF trainer, 0 << 3		;是否开启Trainer，1为开启
	.DEF sram, 0 << 1		;是否开启SRAM，1为开启
	.DEF mirror, 0			;0为横向镜像，1为纵向
	
	.ORG $BFF0
	.BASE 0
	.DB $4E, $45, $53, $1A, prgRomPage, chrRomPage
	.DB ((mapper & $F) << 4) | trainer | fourScreen | sram | mirror
	.DB (mapper & $F)
	
	.ORG $C000
	.BASE $10

RESET
IRQ

-	LDA $2002
	BPL -
-	LDA $2002
	BPL -
	
	LDA #$0
	STA $2000
	STA $2001
	
	LDX #$FF
	TXS

	INX
	TXA
-	STA $00,x
	DEX
	BNE -

	LDA #<palette
	STA $0
	LDA #>palette
	STA $1
	JSR ppuWrite
	
	LDA #<helloWorld
	STA $0
	LDA #>helloWorld
	STA $1
	JSR ppuWrite

-	LDA $2002
	BPL -

	LDA #@00110000
	STA $2000
	
	LDA #@00001110
	STA $2001

NMI
	LDA $2002
	LDA #0
	STA $2005
	STA $2005
	JMP *

ppuWrite	;+写入PPU
	LDY #$0
	LDA ($0),y
	STA $2006
	INY
	LDA ($0),y
	STA $2006
	INY
-	LDA ($0),y
	CMP #$FF
	BEQ +
	INY
	STA $2007
	JMP -
+	RTS
	;-写入PPU

	.INCLUDE "data.asm"

	.ORG $FFFA
	.DW NMI
	.DW RESET
	.DW IRQ
	
	.INCBIN "CHR-ROM.bin"