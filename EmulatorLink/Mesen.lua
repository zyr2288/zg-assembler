local socket = require("socket.core");
local tcp = socket.tcp();
local port = 141414;

tcp:settimeout(2);

local res = tcp:connect("127.0.0.1", port);

local text;
repeat
  text = tcp:receive();
  emu.log(text);
until text == nil;