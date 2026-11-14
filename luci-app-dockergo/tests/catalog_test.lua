-- Run on iStoreOS: lua tests/catalog_test.lua luasrc/model/dockergo/catalog.lua
-- All filesystem and network calls below are in-memory mocks.
local jsonc = require "luci.jsonc"
local util = require "luci.util"
local files, directories, modified = {}, {}, {}
local downloads, next_body, next_status, sequence = 0, nil, 0, 0
local rename_failed = false
local cache_path = "/var/run/dockergo/apps.json"
local valid_body = '{"schemaVersion":1,"apps":[],"tags":["Web"]}'

package.loaded["nixio.fs"] = {
	readfile = function(path, limit)
		return files[path] and files[path]:sub(1, limit)
	end,
	stat = function(path) return modified[path] end,
	lstat = function(path) return directories[path] and "dir" or nil end,
	mkdir = function(path, mode)
		assert(mode == "700")
		if directories[path] then return nil end
		directories[path] = true
		return true
	end,
	chmod = function(_, mode) assert(mode == "700") return true end,
	unlink = function(path) files[path] = nil return true end,
	rmdir = function(path) directories[path] = nil return true end,
	rename = function(source, target)
		if rename_failed then return nil end
		files[target], files[source] = files[source], nil
		modified[target] = os.time()
		return true
	end,
}
package.loaded["luci.sys"] = {
	uniqueid = function() sequence = sequence + 1 return tostring(sequence) end,
	call = function(command)
		downloads = downloads + 1
		assert(command:find("--max-time 20", 1, true))
		assert(command:find("--max-filesize 1048576", 1, true))
		assert(command:find("--proto-redir '=https'", 1, true))
		assert(command:find("https://github.com/Carseason/dockergo/releases/download/apps/apps.json", 1, true))
		local output = assert(command:match("%-%-output '([^']+)'"))
		files[output] = next_body
		return next_status
	end,
}
local loader = assert(loadfile(assert(arg[1], "pass catalog module path")))()
local function validate(catalog)
	return type(catalog) == "table" and catalog.schemaVersion == 1 and
		type(catalog.tags) == "table", "invalid catalog"
end
local function clean_temporary_files()
	for path in pairs(files) do assert(path == cache_path, "temporary file leaked") end
	for path in pairs(directories) do assert(path == "/var/run/dockergo", "temporary directory leaked") end
end

next_body = valid_body
assert(loader.load(validate, true).tags[1] == "Web")
assert(downloads == 1 and files[cache_path] == valid_body)
clean_temporary_files()
assert(loader.load(validate, false))
assert(downloads == 1, "fresh cache should avoid another download")
assert(loader.load(validate, true))
assert(downloads == 2, "market refresh should download again")
modified[cache_path] = os.time() - 301
assert(loader.load(validate, false))
assert(downloads == 3, "expired cache should download again")

for _, bad in ipairs({"invalid JSON", '{"schemaVersion":2}', string.rep("x", 1048577)}) do
	next_body = bad
	local result, status, code = loader.load(validate, true)
	assert(not result and status == 502 and code == "CATALOG_INVALID")
	assert(files[cache_path] == valid_body, "invalid download replaced good cache")
	clean_temporary_files()
end
next_status = 22
local result, status, code = loader.load(validate, true)
assert(not result and status == 503 and code == "CATALOG_DOWNLOAD_FAILED")
assert(files[cache_path] == valid_body, "download failure replaced good cache")
clean_temporary_files()

next_body, next_status, rename_failed = valid_body, 0, true
result, status, code = loader.load(validate, true)
assert(not result and status == 500 and code == "CATALOG_CACHE_FAILED")
clean_temporary_files()
print("CDN catalog tests passed: download, cache, refresh, expiry, invalid/oversize JSON, network failure, atomic replacement failure, cleanup")
