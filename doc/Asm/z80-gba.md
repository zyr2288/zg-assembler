# Z80 指令集速查表

## 一、基础指令表 (00-FF)

| 高\低   | 0x0        | 0x1        | 0x2         | 0x3         | 0x4         | 0x5        | 0x6        | 0x7        | 0x8        | 0x9        | 0xA         | 0xB       | 0xC         | 0xD     | 0xE        | 0xF     |
| ------- | ---------- | ---------- | ----------- | ----------- | ----------- | ---------- | ---------- | ---------- | ---------- | ---------- | ----------- | --------- | ----------- | ------- | ---------- | ------- |
| **0x0** | NOP        | LD BC, NN  | LD (BC), A  | INC BC      | INC B       | DEC B      | LD B, N    | RLCA       | EX AF, AF' | ADD HL, BC | LD A, (BC)  | DEC BC    | INC C       | DEC C   | LD C, N    | RRCA    |
| **0x1** | DJNZ e     | LD DE, NN  | LD (DE), A  | INC DE      | INC D       | DEC D      | LD D, N    | RLA        | JR e       | ADD HL, DE | LD A, (DE)  | DEC DE    | INC E       | DEC E   | LD E, N    | RRA     |
| **0x2** | JR NZ, e   | LD HL, NN  | LD (NN), HL | INC HL      | INC H       | DEC H      | LD H, N    | DAA        | JR Z, e    | ADD HL, HL | LD HL, (NN) | DEC HL    | INC L       | DEC L   | LD L, N    | CPL     |
| **0x3** | JR NC, e   | LD SP, NN  | LD (NN), A  | INC SP      | INC (HL)    | DEC (HL)   | LD (HL), N | SCF        | JR C, e    | ADD HL, SP | LD A, (NN)  | DEC SP    | INC A       | DEC A   | LD A, N    | CCF     |
| **0x4** | LD B, B    | LD B, C    | LD B, D     | LD B, E     | LD B, H     | LD B, L    | LD B, (HL) | LD B, A    | LD C, B    | LD C, C    | LD C, D     | LD C, E   | LD C, H     | LD C, L | LD C, (HL) | LD C, A |
| **0x5** | LD D, B    | LD D, C    | LD D, D     | LD D, E     | LD D, H     | LD D, L    | LD D, (HL) | LD D, A    | LD E, B    | LD E, C    | LD E, D     | LD E, E   | LD E, H     | LD E, L | LD E, (HL) | LD E, A |
| **0x6** | LD H, B    | LD H, C    | LD H, D     | LD H, E     | LD H, H     | LD H, L    | LD H, (HL) | LD H, A    | LD L, B    | LD L, C    | LD L, D     | LD L, E   | LD L, H     | LD L, L | LD L, (HL) | LD L, A |
| **0x7** | LD (HL), B | LD (HL), C | LD (HL), D  | LD (HL), E  | LD (HL), H  | LD (HL), L | HALT       | LD (HL), A | LD A, B    | LD A, C    | LD A, D     | LD A, E   | LD A, H     | LD A, L | LD A, (HL) | LD A, A |
| **0x8** | ADD B      | ADD C      | ADD D       | ADD E       | ADD H       | ADD L      | ADD (HL)   | ADD A      | ADC B      | ADC C      | ADC D       | ADC E     | ADC H       | ADC L   | ADC (HL)   | ADC A   |
| **0x9** | SUB B      | SUB C      | SUB D       | SUB E       | SUB H       | SUB L      | SUB (HL)   | SUB A      | SBC B      | SBC C      | SBC D       | SBC E     | SBC H       | SBC L   | SBC (HL)   | SBC A   |
| **0xA** | AND B      | AND C      | AND D       | AND E       | AND H       | AND L      | AND (HL)   | AND A      | XOR B      | XOR C      | XOR D       | XOR E     | XOR H       | XOR L   | XOR (HL)   | XOR A   |
| **0xB** | OR B       | OR C       | OR D        | OR E        | OR H        | OR L       | OR (HL)    | OR A       | CP B       | CP C       | CP D        | CP E      | CP H        | CP L    | CP (HL)    | CP A    |
| **0xC** | RET NZ     | POP BC     | JP NZ, NN   | JP NN       | CALL NZ, NN | PUSH BC    | ADD N      | RST 00     | RET Z      | RET        | JP Z, NN    | -         | CALL Z, NN  | CALL NN | ADC N      | RST 08  |
| **0xD** | RET NC     | POP DE     | JP NC, NN   | OUT (N), A  | CALL NC, NN | PUSH DE    | SUB N      | RST 10     | RET C      | EXX        | JP C, NN    | IN A, (N) | CALL C, NN  | -       | SBC N      | RST 18  |
| **0xE** | RET PO     | POP HL     | JP PO, NN   | EX (SP), HL | CALL PO, NN | PUSH HL    | AND N      | RST 20     | RET PE     | JP (HL)    | JP PE, NN   | EX DE, HL | CALL PE, NN | -       | XOR N      | RST 28  |
| **0xF** | RET P      | POP AF     | JP P, NN    | DI          | CALL P, NN  | PUSH AF    | OR N       | RST 30     | RET M      | LD SP, HL  | JP M, NN    | EI        | CALL M, NN  | -       | CP N       | RST 38  |

---

## 二、CB 前缀指令表 (CB00-CBFF)

| CB\低 4 位 | 0x0     | 0x1     | 0x2     | 0x3     | 0x4     | 0x5     | 0x6        | 0x7     | 0x8     | 0x9     | 0xA     | 0xB     | 0xC     | 0xD     | 0xE        | 0xF     |
| ---------- | ------- | ------- | ------- | ------- | ------- | ------- | ---------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ---------- | ------- |
| **0x0**    | RLC B   | RLC C   | RLC D   | RLC E   | RLC H   | RLC L   | RLC (HL)   | RLC A   | RRC B   | RRC C   | RRC D   | RRC E   | RRC H   | RRC L   | RRC (HL)   | RRC A   |
| **0x1**    | RL B    | RL C    | RL D    | RL E    | RL H    | RL L    | RL (HL)    | RL A    | RR B    | RR C    | RR D    | RR E    | RR H    | RR L    | RR (HL)    | RR A    |
| **0x2**    | SLA B   | SLA C   | SLA D   | SLA E   | SLA H   | SLA L   | SLA (HL)   | SLA A   | SRA B   | SRA C   | SRA D   | SRA E   | SRA H   | SRA L   | SRA (HL)   | SRA A   |
| **0x3**    | SLL B   | SLL C   | SLL D   | SLL E   | SLL H   | SLL L   | SLL (HL)   | SLL A   | SRL B   | SRL C   | SRL D   | SRL E   | SRL H   | SRL L   | SRL (HL)   | SRL A   |
| **0x4**    | BIT 0,B | BIT 0,C | BIT 0,D | BIT 0,E | BIT 0,H | BIT 0,L | BIT 0,(HL) | BIT 0,A | BIT 1,B | BIT 1,C | BIT 1,D | BIT 1,E | BIT 1,H | BIT 1,L | BIT 1,(HL) | BIT 1,A |
| **0x5**    | BIT 2,B | BIT 2,C | BIT 2,D | BIT 2,E | BIT 2,H | BIT 2,L | BIT 2,(HL) | BIT 2,A | BIT 3,B | BIT 3,C | BIT 3,D | BIT 3,E | BIT 3,H | BIT 3,L | BIT 3,(HL) | BIT 3,A |
| **0x6**    | BIT 4,B | BIT 4,C | BIT 4,D | BIT 4,E | BIT 4,H | BIT 4,L | BIT 4,(HL) | BIT 4,A | BIT 5,B | BIT 5,C | BIT 5,D | BIT 5,E | BIT 5,H | BIT 5,L | BIT 5,(HL) | BIT 5,A |
| **0x7**    | BIT 6,B | BIT 6,C | BIT 6,D | BIT 6,E | BIT 6,H | BIT 6,L | BIT 6,(HL) | BIT 6,A | BIT 7,B | BIT 7,C | BIT 7,D | BIT 7,E | BIT 7,H | BIT 7,L | BIT 7,(HL) | BIT 7,A |
| **0x8**    | RES 0,B | RES 0,C | RES 0,D | RES 0,E | RES 0,H | RES 0,L | RES 0,(HL) | RES 0,A | RES 1,B | RES 1,C | RES 1,D | RES 1,E | RES 1,H | RES 1,L | RES 1,(HL) | RES 1,A |
| **0x9**    | RES 2,B | RES 2,C | RES 2,D | RES 2,E | RES 2,H | RES 2,L | RES 2,(HL) | RES 2,A | RES 3,B | RES 3,C | RES 3,D | RES 3,E | RES 3,H | RES 3,L | RES 3,(HL) | RES 3,A |
| **0xA**    | RES 4,B | RES 4,C | RES 4,D | RES 4,E | RES 4,H | RES 4,L | RES 4,(HL) | RES 4,A | RES 5,B | RES 5,C | RES 5,D | RES 5,E | RES 5,H | RES 5,L | RES 5,(HL) | RES 5,A |
| **0xB**    | RES 6,B | RES 6,C | RES 6,D | RES 6,E | RES 6,H | RES 6,L | RES 6,(HL) | RES 6,A | RES 7,B | RES 7,C | RES 7,D | RES 7,E | RES 7,H | RES 7,L | RES 7,(HL) | RES 7,A |
| **0xC**    | SET 0,B | SET 0,C | SET 0,D | SET 0,E | SET 0,H | SET 0,L | SET 0,(HL) | SET 0,A | SET 1,B | SET 1,C | SET 1,D | SET 1,E | SET 1,H | SET 1,L | SET 1,(HL) | SET 1,A |
| **0xD**    | SET 2,B | SET 2,C | SET 2,D | SET 2,E | SET 2,H | SET 2,L | SET 2,(HL) | SET 2,A | SET 3,B | SET 3,C | SET 3,D | SET 3,E | SET 3,H | SET 3,L | SET 3,(HL) | SET 3,A |
| **0xE**    | SET 4,B | SET 4,C | SET 4,D | SET 4,E | SET 4,H | SET 4,L | SET 4,(HL) | SET 4,A | SET 5,B | SET 5,C | SET 5,D | SET 5,E | SET 5,H | SET 5,L | SET 5,(HL) | SET 5,A |
| **0xF**    | SET 6,B | SET 6,C | SET 6,D | SET 6,E | SET 6,H | SET 6,L | SET 6,(HL) | SET 6,A | SET 7,B | SET 7,C | SET 7,D | SET 7,E | SET 7,H | SET 7,L | SET 7,(HL) | SET 7,A |

---

## 三、ED 前缀指令表 (ED00-EDFF)

| ED\低 4 位 | 0x0      | 0x1       | 0x2       | 0x3        | 0x4 | 0x5  | 0x6  | 0x7    | 0x8      | 0x9       | 0xA       | 0xB        | 0xC | 0xD  | 0xE  | 0xF    |
| ---------- | -------- | --------- | --------- | ---------- | --- | ---- | ---- | ------ | -------- | --------- | --------- | ---------- | --- | ---- | ---- | ------ |
| **0x0**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0x1**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0x2**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0x3**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0x4**    | IN B,(C) | OUT (C),B | SBC HL,BC | LD (NN),BC | NEG | RETN | IM 0 | LD I,A | IN C,(C) | OUT (C),C | ADC HL,BC | LD BC,(NN) | NEG | RETI | IM 0 | LD R,A |
| **0x5**    | IN D,(C) | OUT (C),D | SBC HL,DE | LD (NN),DE | NEG | RETN | IM 1 | LD A,I | IN E,(C) | OUT (C),E | ADC HL,DE | LD DE,(NN) | NEG | RETN | IM 2 | LD A,R |
| **0x6**    | IN H,(C) | OUT (C),H | SBC HL,HL | LD (NN),HL | NEG | RETN | IM 0 | RRD    | IN L,(C) | OUT (C),L | ADC HL,HL | LD HL,(NN) | NEG | RETN | IM 0 | RLD    |
| **0x7**    | IN (C)   | OUT (C),0 | SBC HL,SP | LD (NN),SP | NEG | RETN | IM 1 | -      | IN A,(C) | OUT (C),A | ADC HL,SP | LD SP,(NN) | NEG | RETN | IM 2 | -      |
| **0x8**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0x9**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0xA**    | LDI      | CPI       | INI       | OUTI       | -   | -    | -    | -      | LDD      | CPD       | IND       | OUTD       | -   | -    | -    | -      |
| **0xB**    | LDIR     | CPIR      | INIR      | OTIR       | -   | -    | -    | -      | LDDR     | CPDR      | INDR      | OTDR       | -   | -    | -    | -      |
| **0xC**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0xD**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0xE**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |
| **0xF**    | -        | -         | -         | -          | -   | -    | -    | -      | -        | -         | -         | -          | -   | -    | -    | -      |

---

## 四、DD 前缀指令表 (IX 寄存器)

| DD\低 4 位 | 0x0         | 0x1         | 0x2         | 0x3         | 0x4         | 0x5         | 0x6         | 0x7         | 0x8       | 0x9        | 0xA         | 0xB      | 0xC        | 0xD        | 0xE         | 0xF      |
| ---------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | --------- | ---------- | ----------- | -------- | ---------- | ---------- | ----------- | -------- |
| **0x0**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | ADD IX,BC  | -           | -        | -          | -          | -           | -        |
| **0x1**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | ADD IX,DE  | -           | -        | -          | -          | -           | -        |
| **0x2**    | LD IX,NN    | LD (NN),IX  | INC IX      | INC IXh     | DEC IXh     | LD IXh,N    | -           | -           | ADD IX,IX | LD IX,(NN) | DEC IX      | INC IXl  | DEC IXl    | LD IXl,N   | -           | -        |
| **0x3**    | -           | -           | -           | -           | -           | -           | -           | -           | ADD IX,SP | -          | -           | -        | -          | -          | -           | -        |
| **0x4**    | LD B,IXh    | LD B,IXl    | LD B,(IX+d) | -           | LD C,IXh    | LD C,IXl    | LD C,(IX+d) | -           | LD D,IXh  | LD D,IXl   | LD D,(IX+d) | -        | LD E,IXh   | LD E,IXl   | LD E,(IX+d) | -        |
| **0x5**    | LD IXh,B    | LD IXh,C    | LD IXh,D    | LD IXh,E    | LD IXh,IXh  | LD IXh,IXl  | LD H,(IX+d) | LD IXh,A    | LD IXl,B  | LD IXl,C   | LD IXl,D    | LD IXl,E | LD IXl,IXh | LD IXl,IXl | LD L,(IX+d) | LD IXl,A |
| **0x6**    | LD (IX+d),B | LD (IX+d),C | LD (IX+d),D | LD (IX+d),E | LD (IX+d),H | LD (IX+d),L | -           | LD (IX+d),A | LD A,IXh  | LD A,IXl   | LD A,(IX+d) | -        | -          | -          | -           | -        |
| **0x7**    | ADD IXh     | ADD IXl     | ADD (IX+d)  | -           | ADC IXh     | ADC IXl     | ADC (IX+d)  | -           | SUB IXh   | SUB IXl    | SUB (IX+d)  | -        | SBC IXh    | SBC IXl    | SBC (IX+d)  | -        |
| **0x8**    | AND IXh     | AND IXl     | AND (IX+d)  | -           | XOR IXh     | XOR IXl     | XOR (IX+d)  | -           | OR IXh    | OR IXl     | OR (IX+d)   | -        | CP IXh     | CP IXl     | CP (IX+d)   | -        |
| **0x9**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xA**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xB**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xC**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xD**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xE**    | POP IX      | EX (SP),IX  | PUSH IX     | JP (IX)     | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xF**    | LD SP,IX    | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |

---

## 五、FD 前缀指令表 (IY 寄存器)

| FD\低 4 位 | 0x0         | 0x1         | 0x2         | 0x3         | 0x4         | 0x5         | 0x6         | 0x7         | 0x8       | 0x9        | 0xA         | 0xB      | 0xC        | 0xD        | 0xE         | 0xF      |
| ---------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | --------- | ---------- | ----------- | -------- | ---------- | ---------- | ----------- | -------- |
| **0x0**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | ADD IY,BC  | -           | -        | -          | -          | -           | -        |
| **0x1**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | ADD IY,DE  | -           | -        | -          | -          | -           | -        |
| **0x2**    | LD IY,NN    | LD (NN),IY  | INC IY      | INC IYh     | DEC IYh     | LD IYh,N    | -           | -           | ADD IY,IY | LD IY,(NN) | DEC IY      | INC IYl  | DEC IYl    | LD IYl,N   | -           | -        |
| **0x3**    | -           | -           | -           | -           | -           | -           | -           | -           | ADD IY,SP | -          | -           | -        | -          | -          | -           | -        |
| **0x4**    | LD B,IYh    | LD B,IYl    | LD B,(IY+d) | -           | LD C,IYh    | LD C,IYl    | LD C,(IY+d) | -           | LD D,IYh  | LD D,IYl   | LD D,(IY+d) | -        | LD E,IYh   | LD E,IYl   | LD E,(IY+d) | -        |
| **0x5**    | LD IYh,B    | LD IYh,C    | LD IYh,D    | LD IYh,E    | LD IYh,IYh  | LD IYh,IYl  | LD H,(IY+d) | LD IYh,A    | LD IYl,B  | LD IYl,C   | LD IYl,D    | LD IYl,E | LD IYl,IYh | LD IYl,IYl | LD L,(IY+d) | LD IYl,A |
| **0x6**    | LD (IY+d),B | LD (IY+d),C | LD (IY+d),D | LD (IY+d),E | LD (IY+d),H | LD (IY+d),L | -           | LD (IY+d),A | LD A,IYh  | LD A,IYl   | LD A,(IY+d) | -        | -          | -          | -           | -        |
| **0x7**    | ADD IYh     | ADD IYl     | ADD (IY+d)  | -           | ADC IYh     | ADC IYl     | ADC (IY+d)  | -           | SUB IYh   | SUB IYl    | SUB (IY+d)  | -        | SBC IYh    | SBC IYl    | SBC (IY+d)  | -        |
| **0x8**    | AND IYh     | AND IYl     | AND (IY+d)  | -           | XOR IYh     | XOR IYl     | XOR (IY+d)  | -           | OR IYh    | OR IYl     | OR (IY+d)   | -        | CP IYh     | CP IYl     | CP (IY+d)   | -        |
| **0x9**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xA**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xB**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xC**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xD**    | -           | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xE**    | POP IY      | EX (SP),IY  | PUSH IY     | JP (IY)     | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |
| **0xF**    | LD SP,IY    | -           | -           | -           | -           | -           | -           | -           | -         | -          | -           | -        | -          | -          | -           | -        |

---

## 符号说明

| 符号   | 含义                      |
| ------ | ------------------------- |
| NN     | 16 位立即数               |
| N      | 8 位立即数                |
| e      | 相对偏移量                |
| d      | 偏移量                    |
| r      | 8 位寄存器(B,C,D,E,H,L,A) |
| IXh    | IX 寄存器高 8 位          |
| IXl    | IX 寄存器低 8 位          |
| IYh    | IY 寄存器高 8 位          |
| IYl    | IY 寄存器低 8 位          |
| (HL)   | HL 指向的内存             |
| (IX+d) | IX+d 指向的内存           |
| (IY+d) | IY+d 指向的内存           |
| -      | 未定义/无效指令           |
