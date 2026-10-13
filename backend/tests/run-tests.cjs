// In-process TypeScript test runner for environments that prohibit child workers.
// Type checking remains a separate tsc --noEmit check.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const resolveOriginal = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith("@/")) request = path.resolve(__dirname, "../../frontend/src", request.slice(2));
  try { return resolveOriginal.call(this, request, parent, ...rest); }
  catch (error) {
    if (error.code !== "MODULE_NOT_FOUND" || !request.endsWith(".js")) throw error;
    return resolveOriginal.call(this, request.slice(0, -3) + ".ts", parent, ...rest);
  }
};
require.extensions[".ts"] = function(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  module._compile(output, filename);
};
const files = process.argv.slice(2);
if (!files.length) throw new Error("Pass one or more tests/*.test.ts paths.");
for (const file of files) require(path.resolve(file));
