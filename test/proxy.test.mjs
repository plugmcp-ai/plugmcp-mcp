import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, Server } from "@modelcontextprotocol/server";
import { createProxy, INSTRUCTIONS, VERSION } from "../dist/proxy.js";

const TOOLS = [
  {
    name: "search_servers",
    description: "Search the directory",
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
];

/** A stand-in for https://plugmcp.ai/mcp-server, reached through an in-memory pair. */
async function fakeUpstream() {
  const upstream = new Server({ name: "plugmcp-directory", version: "test" }, { capabilities: { tools: {} } });
  upstream.setRequestHandler("tools/list", async () => ({ tools: TOOLS }));
  upstream.setRequestHandler("tools/call", async (request) => {
    if (request.params.name !== "search_servers") {
      return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify({ query: request.params.arguments?.query ?? null }) }] };
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await upstream.connect(a);
  const client = new Client({ name: "proxy-upstream", version: "test" });
  await client.connect(b);
  return client;
}

async function connectTo(proxy) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await proxy.server.connect(a);
  const client = new Client({ name: "downstream", version: "test" });
  await client.connect(b);
  return client;
}

test("identifies itself and passes instructions", async () => {
  const proxy = createProxy({ upstream: fakeUpstream });
  const client = await connectTo(proxy);
  assert.equal(client.getServerVersion()?.name, "plugmcp");
  assert.equal(client.getServerVersion()?.version, VERSION);
  assert.equal(client.getInstructions(), INSTRUCTIONS);
  await client.close();
  await proxy.close();
});

test("forwards tools/list and tools/call", async () => {
  const proxy = createProxy({ upstream: fakeUpstream });
  const client = await connectTo(proxy);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name),
    ["search_servers"],
  );
  assert.equal(tools[0].annotations?.readOnlyHint, true);
  const result = await client.callTool({ name: "search_servers", arguments: { query: "postgres" } });
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text), { query: "postgres" });
  await client.close();
  await proxy.close();
});

test("an unreachable directory is a tool error, and the next call retries", async () => {
  let attempts = 0;
  const proxy = createProxy({
    url: "https://example.invalid/mcp-server",
    upstream: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("connect ECONNREFUSED");
      return fakeUpstream();
    },
  });
  const client = await connectTo(proxy);
  const failed = await client.callTool({ name: "search_servers", arguments: {} });
  assert.equal(failed.isError, true);
  assert.match(failed.content[0].text, /Could not reach the PlugMCP directory at https:\/\/example\.invalid/);
  const ok = await client.callTool({ name: "search_servers", arguments: { query: "x" } });
  assert.notEqual(ok.isError, true);
  assert.equal(attempts, 2);
  await client.close();
  await proxy.close();
});
