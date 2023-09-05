local socket = require("socket.core");
local server = socket.tcp();
local port = 14000;
local emuPause = false;
local connection = nil;

local ConectTimeout = 0.00001;

-- Table的Key必须是string类型的，否则key无效
local breaks = {};
local cpuBreakCount = {};


function DoInOneFrame()
	ReceiveData();
end

function StringSplit(str, spliter)
	local result = {};
	for match in (str .. spliter):gmatch("(.-)" .. spliter) do
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
	local args = StringSplit(message, ' ');
	local messageId = args[1];
	local responseData = RunCommand(args[2], args[3]);
	if responseData ~= nil then
		connection:send(messageId .. " " .. args[2] .. " " .. responseData);
	end
end

function RunCommand(command, data)
	local args = StringSplit(data, ",");
	if command == "registers" then
		local state = emu.getState();
		return GetTableValues(state.cpu, { "a", "x", "y", "pc", "sp" });
	elseif command == "memory" then
		return emu.read(data, emu.memType.cpu);
	elseif command == "set-break" then
		SetBreakpoint(args[1], args[2]);
	end
end

function SendMessage(command, data)
	local response = "undefined " .. command .. " " .. data;
	emu.log(response);
	connection:send(response);
end

function GetTableValues(table, keys)
	local result = "";
	for i = 1, #keys do
		local type = type(table[keys[i]]);
		if type == "number" then
			result = result .. "\"" .. keys[i] .. "\":" .. table[keys[i]] .. ",";
		elseif type == "string" then
			result = result .. "\"" .. keys[i] .. "\":\"" .. table[keys[i]] .. "\",";
		end
	end
	result = string.sub(result, 1, string.len(result) - 1);
	return "{" .. result .. "}";
end

function SetBreakpoint(cpuAddress, prgAddress)
	local prgAddrStr = "prg-" .. prgAddress;
	local cpuAddrStr = "cpu-" .. cpuAddress;
	if breaks[prgAddrStr] ~= nil then
		return;
	end

	breaks[prgAddrStr] = cpuAddress;
	if cpuBreakCount[cpuAddrStr] == nil then
		cpuBreakCount[cpuAddrStr] = 1;
	else
		cpuBreakCount[cpuAddrStr] = cpuBreakCount[cpuAddrStr] + 1;
	end

	emu.addMemoryCallback(MemoryCallback, emu.memCallbackType.cpuExec, cpuAddress);
end

function MemoryCallback(cpuAddress)
	local prgAddress = emu.getPrgRomOffset(cpuAddress);
	local prgAddrStr = "prg-" .. prgAddress;
	if prgAddress == -1 or prgAddress == nil then
		return;
	end

	local temp = tonumber(breaks[prgAddrStr]);
	if temp == cpuAddress then
		emu.breakExecution();
		SendMessage("break", prgAddress);
	end
end

function ClearBreakpoint(cpuAddress, prgAddress)
	emu.log("clear breakpoint");
	if breaks[prgAddress] == nil then
		return;
	end

	breaks[prgAddress] = nil;
	if cpuBreakCount[cpuAddress] == nil then
		return;
	end

	cpuBreakCount[cpuAddress] = cpuBreakCount[cpuAddress] - 1;
	if cpuBreakCount[cpuAddress] == 0 then
		emu.removeMemoryCallback(MemoryCallback, emu.memCallbackType.cpuExec, cpuAddress);
		cpuBreakCount[cpuAddress] = nil;
	end
end

server:settimeout(2);
server:bind("127.0.0.1", port);

local listener = server:listen(10);
connection = server:accept();
connection:settimeout(ConectTimeout);

emu.addEventCallback(DoInOneFrame, emu.eventType.endFrame);
