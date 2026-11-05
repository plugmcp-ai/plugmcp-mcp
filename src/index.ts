#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createProxy, DEFAULT_URL, VERSION } from "./proxy.js";

const HELP = `plugmcp-mcp ${VERSION}

Stdio MCP server for the PlugMCP directory. Search MCP servers and agent skills,
compare them, and get the install config for your client.

Usage: npx -y plugmcp-mcp

Environment:
  PLUGMCP_API_KEY  Optional pb_live_ key from https://plugmcp.ai/app.
                   Without it: 20 calls a day per IP. Free account: 400 a day.
  PLUGMCP_URL      Directory endpoint. Default: ${DEFAULT_URL}

No install needed for clients that support remote servers:
  ${DEFAULT_URL}
`;

const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}

const proxy = createProxy({ url: process.env.PLUGMCP_URL, apiKey: process.env.PLUGMCP_API_KEY });

async function shutdown(code: number) {
  await proxy.close();
  process.exit(code);
}

process.stdin.on("close", () => void shutdown(0));
process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

proxy.server.connect(new StdioServerTransport()).catch((err: unknown) => {
  process.stderr.write(`plugmcp-mcp: ${err instanceof Error ? err.message : String(err)}\n`);
  void shutdown(1);
});
