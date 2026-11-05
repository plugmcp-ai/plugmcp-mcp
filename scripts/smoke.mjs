// Runs the built server over stdio against the live directory: initialize, tools/list, two tool calls.
//   npm run build && npm run smoke
// PLUGMCP_URL and PLUGMCP_API_KEY are passed through when set.
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const env = { ...getDefaultEnvironment() };
for (const name of ["PLUGMCP_URL", "PLUGMCP_API_KEY"]) if (process.env[name]) env[name] = process.env[name];

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const client = new Client({ name: "plugmcp-mcp-smoke", version: "1" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: "inherit" }));
check("initialize", client.getServerVersion()?.name === "plugmcp", JSON.stringify(client.getServerVersion()));

const { tools } = await client.listTools();
check("tools/list", tools.length >= 6, tools.map((t) => t.name).join(","));

const search = await client.callTool({ name: "search_servers", arguments: { query: "postgres", limit: 3 } });
check("search_servers", !search.isError && Boolean(search.content?.[0]?.text), `${search.content?.[0]?.text?.length ?? 0} chars`);

const install = await client.callTool({ name: "get_install", arguments: { slug: "github-github-mcp-server", client: "cursor" } });
check("get_install", !install.isError && Boolean(install.content?.[0]?.text), `${install.content?.[0]?.text?.length ?? 0} chars`);

await client.close();
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
