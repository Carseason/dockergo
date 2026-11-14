local fs = require "nixio.fs"
local sys = require "luci.sys"
local util = require "luci.util"
local jsonc = require "luci.jsonc"

local M = {}
local SOURCE = "https://github.com/Carseason/dockergo/releases/download/apps/apps.json"
local CACHE_DIR = "/var/run/dockergo"
local CACHE_PATH = CACHE_DIR .. "/apps.json"
local CACHE_SECONDS = 300
local MAX_BYTES = 1024 * 1024

local function read_catalog(path, validate)
	local contents = fs.readfile(path, MAX_BYTES + 1)
	if not contents or #contents == 0 or #contents > MAX_BYTES then
		return nil, "应用目录为空或超过 1 MiB"
	end
	local catalog = jsonc.parse(contents)
	local valid, message = validate(catalog)
	if not valid then
		return nil, message
	end
	return catalog
end

-- The market refreshes from the CDN; installation and container identity reuse
-- the same validated snapshot for up to five minutes. Never fall back to the
-- bundled catalog when the remote source fails.
function M.load(validate, refresh)
	if not refresh then
		local modified = fs.stat(CACHE_PATH, "mtime")
		local age = modified and (os.time() - modified)
		if age and age >= 0 and age < CACHE_SECONDS then
			local cached = read_catalog(CACHE_PATH, validate)
			if cached then return cached end
		end
	end

	if fs.lstat(CACHE_DIR, "type") ~= "dir" and not fs.mkdir(CACHE_DIR, "700") then
		return nil, 500, "CATALOG_CACHE_FAILED", "无法创建目录缓存"
	end
	if not fs.chmod(CACHE_DIR, "700") then
		return nil, 500, "CATALOG_CACHE_FAILED", "无法保护目录缓存"
	end
	local id = sys.uniqueid(16)
	local temporary_dir = id and (CACHE_DIR .. "/catalog-" .. id)
	if not temporary_dir or not fs.mkdir(temporary_dir, "700") then
		return nil, 500, "CATALOG_CACHE_FAILED", "无法创建下载临时目录"
	end
	local temporary_path = temporary_dir .. "/apps.json"
	local function cleanup()
		fs.unlink(temporary_path)
		fs.rmdir(temporary_dir)
	end
	local command = "curl --fail --silent --show-error --location --max-redirs 5 " ..
		"--proto '=https' --proto-redir '=https' --connect-timeout 5 --max-time 20 " ..
		"--max-filesize 1048576 --header 'Cache-Control: no-cache' --output " ..
		util.shellquote(temporary_path) .. " " .. util.shellquote(SOURCE) .. " >/dev/null 2>&1"
	if sys.call(command) ~= 0 then
		cleanup()
		return nil, 503, "CATALOG_DOWNLOAD_FAILED", "无法从 CDN 获取应用目录，请检查设备网络或稍后刷新"
	end
	local catalog, message = read_catalog(temporary_path, validate)
	if not catalog then
		cleanup()
		return nil, 502, "CATALOG_INVALID", message
	end
	if not fs.rename(temporary_path, CACHE_PATH) then
		cleanup()
		return nil, 500, "CATALOG_CACHE_FAILED", "无法保存应用目录缓存"
	end
	cleanup()
	return catalog
end

return M
