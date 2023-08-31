local socket = require("socket.core");
local server = socket.tcp();
local port = 14000;
local emuPause = false;
local connection = nil;
local test = 0;

function DoInOneFrame()
	ReceiveData();
end

function StringSplit(str, spliter)
	local result = {};
	for match in (str..spliter):gmatch("(.-)"..spliter) do
		table.insert(result, match);
	end
	return result;
end


function ReceiveData()
	if connection == nil then
		return;
	end
	local message = connection:receive();
	if message == nil then
		return;
	end
	local args = StringSplit(message, ' ');		-- arg 1~3，分别是 messageId command data
	local messageId = args[1];    -- lua很恶心，下标从1开始
	local responseData = RunCommand(args[2], args[3]);
	connection:send(messageId.." "..responseData);
end

function RunCommand(command, data)
	if command == "registers" then
		local state = emu.getState();
		return state.cpu.a..state.cpu.x;
	end
end


server:settimeout(2);
server:bind("127.0.0.1", port);

local listener = server:listen(10);
connection = server:accept();
connection:settimeout(1);

emu.addEventCallback(DoInOneFrame, emu.eventType.endFrame);