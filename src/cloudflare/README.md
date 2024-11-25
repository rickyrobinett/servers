# Cloudflare KV MCP Server

A Model Context Protocol server implementation for Cloudflare KV stores. This server enables LLMs to interact with Cloudflare KV through a secure API.

## Features

### Tools

- **kv_get**
  - Get a value from KV store
  - Input: 
    - `key` (string): The key to retrieve

- **kv_put**
  - Put a value into KV store
  - Input:
    - `key` (string): The key to store
    - `value` (string): The value to store
    - `expirationTtl` (number, optional): Expiration time in seconds

- **kv_delete**
  - Delete a key from KV store
  - Input:
    - `key` (string): The key to delete

- **kv_list**
  - List keys in KV store
  - Input:
    - `prefix` (string, optional): Filter keys by prefix
    - `limit` (number, optional): Maximum number of keys to return

## Setup

1. Create a Cloudflare API token with KV permissions
2. Get your Account ID and KV Namespace ID from Cloudflare dashboard

## Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "cloudflare-kv": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-cloudflare-kv"],
    "env": {
      "CLOUDFLARE_ACCOUNT_ID": "<YOUR_ACCOUNT_ID>",
      "CLOUDFLARE_API_TOKEN": "<YOUR_API_TOKEN>",
      "CLOUDFLARE_KV_NAMESPACE_ID": "<YOUR_NAMESPACE_ID>"
    }
  }
}
```

## License

This MCP server is licensed under the MIT License.