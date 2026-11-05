<p align="center">
  <img src="logo.svg" alt="PlugMCP" width="96" />
</p>

<h1 align="center">plugmcp-mcp</h1>

<p align="center">
  One MCP server that finds the rest. Your agent searches 70,000+ MCP servers and agent skills, compares them, and gets the exact install config for your client.
</p>

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=plugmcp&config=eyJ1cmwiOiJodHRwczovL3BsdWdtY3AuYWkvbWNwLXNlcnZlciJ9"><img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="Add to Cursor" height="32" /></a>
  <a href="https://insiders.vscode.dev/redirect/mcp/install?name=plugmcp&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fplugmcp.ai%2Fmcp-server%22%7D"><img src="https://img.shields.io/badge/VS_Code-Install_MCP-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white" alt="Install in VS Code" height="32" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/plugmcp-mcp"><img src="https://img.shields.io/npm/v/plugmcp-mcp?style=flat-square&color=0099FF" alt="npm" /></a>
  <a href="https://registry.modelcontextprotocol.io/v0/servers?search=ai.plugmcp"><img src="https://img.shields.io/badge/MCP_Registry-ai.plugmcp%2Fdirectory-34D399?style=flat-square" alt="MCP Registry" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F2EFE9?style=flat-square" alt="MIT" /></a>
  <a href="https://github.com/plugmcp-ai/plugmcp-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/plugmcp-ai/plugmcp-mcp/ci.yml?style=flat-square&label=ci" alt="CI" /></a>
</p>

## Ask your agent

Once it is connected, ask in plain words:

- "Find an MCP server that lets Cursor query my Postgres database, and install it."
- "Compare the GitHub and GitLab MCP servers."
- "What MCP servers came out this week?"
- "Give me the Claude Code command for the Linear MCP server."
- "Find an agent skill for editing PDFs and give me the message to install it in Grok Bot."

## Install

The fastest path needs no install at all. The directory is a remote MCP server at:

```
https://plugmcp.ai/mcp-server
```

Use this package when your client only runs local (stdio) servers, or when you want the server in a lockfile.

### Claude Code

```sh
claude mcp add --transport http plugmcp https://plugmcp.ai/mcp-server
# or local:
claude mcp add plugmcp -- npx -y plugmcp-mcp
```

### Cursor, Windsurf, Claude Desktop, and any mcpServers JSON

```json
{
  "mcpServers": {
    "plugmcp": {
      "command": "npx",
      "args": ["-y", "plugmcp-mcp"]
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "plugmcp": { "type": "http", "url": "https://plugmcp.ai/mcp-server" }
  }
}
```

### Codex CLI

```sh
codex mcp add plugmcp --url https://plugmcp.ai/mcp-server
```

### Grok Bot

Grok Bot has no config file. Send this in a Grok Bot chat and confirm the card:

```
Add a custom MCP server called plugmcp at https://plugmcp.ai/mcp-server
```

Every Bot on your account gets it; attach it to a task with `@`. Then ask for any server or skill with `grok-bot` as the client, and the reply is the message that adds that one too.

### Grok Build and grok.com

- Grok Build: `grok mcp add --transport http plugmcp https://plugmcp.ai/mcp-server`
- grok.com: open [Connectors](https://grok.com/connectors), choose New Connector, then Custom, and paste `https://plugmcp.ai/mcp-server`.

### ChatGPT

Settings, then Connectors, then Add. Name `plugmcp`, URL `https://plugmcp.ai/mcp-server`.

## API key (optional)

Every tier is paced, so one busy agent cannot use the whole day at once:

| | Per minute | Per hour | Per day |
| --- | --- | --- | --- |
| No key (per IP) | 5 | 10 | 20 |
| Free account key | 15 | 60 | 400 |
| Paid plan key | 300 | no cap | 20,000 |

When a limit is hit, the tool result says which one and when it resets. Calls without a key may also wait while the directory is busy; key holders keep working. Create a `pb_live_` key at [plugmcp.ai/app](https://plugmcp.ai/app) and pass it as `PLUGMCP_API_KEY`:

```json
{
  "mcpServers": {
    "plugmcp": {
      "command": "npx",
      "args": ["-y", "plugmcp-mcp"],
      "env": { "PLUGMCP_API_KEY": "pb_live_..." }
    }
  }
}
```

For the remote URL, send it as `Authorization: Bearer pb_live_...`. Details are in [auth.md](https://plugmcp.ai/auth.md).

## Tools

Every tool is read-only.

| Tool | What it does |
| --- | --- |
| `search_servers` | Keyword search with filters for remote, official, and client |
| `recommend_servers` | Ranked picks for a task described in plain words |
| `get_server` | One server: tools, auth, packages, health, and optionally the README |
| `get_install` | The exact config for Cursor, Claude Code, Claude Desktop, VS Code, Windsurf, ChatGPT, Codex, Gemini CLI, Grok Build, Grok Bot, or plain JSON |
| `compare_servers` | Side by side for two to five servers |
| `whats_new` | Servers added recently |
| `list_categories` | Categories with counts |
| `search_skills` | Search agent skills (SKILL.md) |
| `get_skill` | One skill with install commands for Cursor, Claude Code, Codex, and Grok Build, plus the Grok Bot message |

## How it works

`plugmcp-mcp` is a small stdio server built on the official MCP TypeScript SDK. It forwards `tools/list` and `tools/call` to `https://plugmcp.ai/mcp-server` over Streamable HTTP. The upstream connection opens on the first call and reconnects after a network error. Nothing is stored locally.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PLUGMCP_API_KEY` | none | Optional `pb_live_` key |
| `PLUGMCP_URL` | `https://plugmcp.ai/mcp-server` | Directory endpoint |

## Develop

```sh
npm ci
npm test        # build, then unit tests against an in-memory upstream
npm run smoke   # run the built server over stdio against plugmcp.ai
```

## Release

Push a `v*` tag that matches `package.json`. The publish workflow runs the tests, publishes to npm (`NPM_TOKEN` secret), then publishes `server.json` to the MCP Registry as `ai.plugmcp/directory`, signed with the plugmcp.ai domain key (`MCP_REGISTRY_PRIVATE_KEY` secret).

## Related

- [awesome-mcp-servers](https://github.com/plugmcp-ai/awesome-mcp-servers): the curated shelves from the same directory.
- [plugmcp.ai/mcp](https://plugmcp.ai/mcp): browse the full directory.
- [plugmcp.ai/directory-mcp](https://plugmcp.ai/directory-mcp): setup guide for every client.

## License

MIT
