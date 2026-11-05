import { Client, ProtocolError, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Server } from "@modelcontextprotocol/server";

export const VERSION = "0.1.0";
export const DEFAULT_URL = "https://plugmcp.ai/mcp-server";

export const INSTRUCTIONS = [
  "PlugMCP is a directory of MCP servers and agent skills.",
  "Use recommend_servers when the user describes a task, search_servers for keywords, and get_install for the exact config for their client.",
  "Answer from the returned data. Every tool is read-only.",
].join(" ");

export type ProxyOptions = {
  /** Directory MCP endpoint. Defaults to https://plugmcp.ai/mcp-server. */
  url?: string;
  /** Optional pb_live_ key; raises the daily limit from 50 calls per IP to the account limit. */
  apiKey?: string;
  /** Replaces the HTTP upstream, for tests. */
  upstream?: () => Promise<Client>;
};

function httpUpstream(url: string, apiKey: string | undefined): () => Promise<Client> {
  const headers: Record<string, string> = { "user-agent": `plugmcp-mcp/${VERSION}` };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  return async () => {
    const client = new Client({ name: "plugmcp-mcp", version: VERSION });
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
    return client;
  };
}

/** One shared upstream connection, opened on first use and reopened after a failure. */
function lazy(open: () => Promise<Client>) {
  let pending: Promise<Client> | null = null;
  return {
    get(): Promise<Client> {
      pending ??= open().catch((err: unknown) => {
        pending = null;
        throw err;
      });
      return pending;
    },
    async close() {
      const current = pending;
      pending = null;
      if (current) await (await current.catch(() => null))?.close().catch(() => undefined);
    },
  };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createProxy(options: ProxyOptions = {}) {
  const url = options.url?.trim() || DEFAULT_URL;
  const apiKey = options.apiKey?.trim() || undefined;
  const upstream = lazy(options.upstream ?? httpUpstream(url, apiKey));

  const server = new Server(
    { name: "plugmcp", title: "PlugMCP directory", version: VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler("tools/list", async (request) => {
    const client = await upstream.get();
    const cursor = request.params?.cursor;
    return client.listTools(cursor ? { cursor } : undefined);
  });

  server.setRequestHandler("tools/call", async (request) => {
    let client: Client;
    try {
      client = await upstream.get();
    } catch (err) {
      return { content: [{ type: "text", text: `Could not reach the PlugMCP directory at ${url}: ${message(err)}` }], isError: true };
    }
    try {
      return await client.callTool({ name: request.params.name, arguments: request.params.arguments ?? {} });
    } catch (err) {
      // Transport failures drop the session so the next call reconnects; protocol errors keep it.
      if (!(err instanceof ProtocolError)) void upstream.close();
      throw err;
    }
  });

  return { server, close: () => upstream.close() };
}
