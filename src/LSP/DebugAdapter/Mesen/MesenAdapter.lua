-- 所有发送的数据已 messageId;command;data的形式发送
-- data的形式是data1=value,data2=value

local socket = require("socket.core");
local Host = "127.0.0.1";
local Port = 4065;
local TimeoutFast = 0.0001;
local server = nil;
local connection = nil;
local pause = false;
local commandAndData = nil;
local functions = {};
local breakpoints = {};
local eventCallback = {};

-- 命中断点
function BreakpointHit(cpuType)
	local state = emu.getState();
	local baseAddr = emu.convertAddress(state["cpu.pc"], emu.memType.nesMemory, emu.cpuType.nes);
	local data = {};
	data["baseAddress"] = baseAddr["address"];
	GetCPURegs(data);
	commandAndData = ProcessSendData("breakpoint-hit", data);
	ProcessMessage();
end
emu.addEventCallback(BreakpointHit, emu.eventType.codeBreak);

-- 获取CPU状态
function GetCPURegs(data)
	local state = emu.getState();
	data["a"] = state["cpu.a"];
	data["x"] = state["cpu.x"];
	data["y"] = state["cpu.y"];
	data["pc"] = state["cpu.pc"];
	data["sp"] = state["cpu.sp"];
	data["p"] = state["cpu.p"];
end
functions["registers-get"] = GetCPURegs;

-- 设定断点
function SetBreakpoint(data)
	local address = data["baseAddress"];
	local memAddr = emu.convertAddress(address, emu.memType.nesPrgRom, emu.cpuType.nes);
	local addr = memAddr["address"];
	breakpoints[address] = {};
	breakpoints[address]["callback"] = emu.addMemoryCallback(MemoryCallback, emu.callbackType.exec, addr, addr, emu.cpuType.nes, emu.memType.nesMemory);
	breakpoints[address]["address"] = addr;
end
functions["breakpoint-set"] = SetBreakpoint;

-- 移除断点
function RemoveBreakpoint(data)
	local address = data["baseAddress"];
	if breakpoints[address] ~= nil then
		local callback = breakpoints[address]["callback"];
		local addr = breakpoints[address]["address"];
		emu.removeMemoryCallback(callback, emu.callbackType.exec, addr, addr, emu.cpuType.nes, emu.memType.nesMemory);
		breakpoints[address] = nil;
	end
end
functions["breakpoint-remove"] = RemoveBreakpoint;

function MemoryCallback(address)
	address = tonumber(address);
	emu.log(address);
	emu.breakExecution();
end

-- 处理接收和发送数据
function ProcessMessage()
	if connection == nil then
		local client, err = server:accept();
		if client ~= nil then
			connection = client;
			connection:settimeout(TimeoutFast);
		end
	end
	if connection ~= nil then
		local data, err, partial = connection:receive();
		if data ~= nil then
			local args = StringSplit(data, ";");
			local msgId = tonumber(args[1]);
			local tempData = nil;
			if args[3] ~= nil then
				tempData = ProcessReceiveData(args[3]);
			end
			local backdata = functions[args[2]](tempData);
			if backdata ~= nil then
				connection:send(msgId .. ";" .. backdata)
			end
		end
		
		if commandAndData ~= nil then
			emu.log(commandAndData);
			connection:send("0;" .. commandAndData);
			commandAndData = nil;
		end
	end
end

-- 处理数据
function ProcessSendData(command, data)
	local result = command;
	if data == nil then
		return result;
	end
	
	result = result .. ";";
	for key, value in pairs(data) do
		result = result .. key .. "=" .. value .. ","
	end

	local length = string.len(result);
	return string.sub(result, 1, length - 1) .. "\n";
end

-- 
function ProcessReceiveData(dataStr)
	if dataStr == nil then
		return nil;
	end
	
	local result = {};
	local parts = StringSplit(dataStr, ",");
	for index, value in ipairs(parts) do
		local p = StringSplit(value, "=");
		result[p[1]] = p[2];
	end
	
	return result;
end

-- 分割字符串
function StringSplit(s, delimiter)
	local result = {};
	for match in (s..delimiter):gmatch("(.-)"..delimiter) do
		table.insert(result, match);
	end
	return result;
end

-- 一帧结束
function EndingLoop()
	while ProcessMessage() do
	end
end

function BreakLoop()
	while ProcessMessage() do
	end
end

server = socket.tcp();
server:settimeout(2);
server:bind(Host, Port);

local listen_status, listen_err = server:listen(10);
if listen_err ~= nil then
	emu.log("Listen Error:" .. listen_err);
else
	server:settimeout(TimeoutFast);
	eventCallback[emu.eventType.endFrame] = emu.addEventCallback(EndingLoop, emu.eventType.endFrame);
	emu.log("listening on " .. Port);
end
