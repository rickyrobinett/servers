#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// Tool definitions
const KV_GET_TOOL: Tool = {
  name: "kv_get",
  description: "Get a value from Cloudflare KV store",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "The key to retrieve"
      }
    },
    required: ["key"]
  }
};

const KV_PUT_TOOL: Tool = {
  name: "kv_put",
  description: "Put a value into Cloudflare KV store",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "The key to store"
      },
      value: {
        type: "string",
        description: "The value to store"
      },
      expirationTtl: {
        type: "number",
        description: "Optional expiration time in seconds"
      }
    },
    required: ["key", "value"]
  }
};

const KV_DELETE_TOOL: Tool = {
  name: "kv_delete",
  description: "Delete a key from Cloudflare KV store",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "The key to delete"
      }
    },
    required: ["key"]
  }
};

const KV_LIST_TOOL: Tool = {
  name: "kv_list",
  description: "List keys in Cloudflare KV store",
  inputSchema: {
    type: "object",
    properties: {
      prefix: {
        type: "string",
        description: "Optional prefix to filter keys"
      },
      limit: {
        type: "number",
        description: "Maximum number of keys to return"
      }
    }
  }
};

const KV_TOOLS = [
  KV_GET_TOOL,
  KV_PUT_TOOL,
  KV_DELETE_TOOL,
  KV_LIST_TOOL,
] as const;

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

 /* if (!accountId || !apiToken || !namespaceId) {
    console.error("Missing required environment variables");
    process.exit(1);
  }*/

  return { accountId, apiToken, namespaceId };
}

const config = getConfig();

// Server setup
const server = new Server(
  {
    name: "mcp-server/cloudflare-kv",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: KV_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "kv_get": {
        const { key } = request.params.arguments as { key: string };
        return await handleGet(key);
      }
      
      case "kv_put": {
        const { key, value, expirationTtl } = request.params.arguments as {
          key: string;
          value: string;
          expirationTtl?: number;
        };
        return await handlePut(key, value, expirationTtl);
      }
      
      case "kv_delete": {
        const { key } = request.params.arguments as { key: string };
        return await handleDelete(key);
      }
      
      case "kv_list": {
        const { prefix, limit } = request.params.arguments as {
          prefix?: string;
          limit?: number;
        };
        return await handleList(prefix, limit);
      }
      
      default:
        return {
          toolResult: {
            content: [{
              type: "text",
              text: `Unknown tool: ${request.params.name}`
            }],
            isError: true
          }
        };
    }
  } catch (error) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      }
    };
  }
});

// API handlers
async function handleGet(key: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values/${key}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
    },
  });

  if (!response.ok) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Failed to get value: ${response.statusText}`
        }],
        isError: true
      }
    };
  }

  const value = await response.text();
  return {
    toolResult: {
      content: [{
        type: "text",
        text: value
      }],
      isError: false
    }
  };
}

async function handlePut(key: string, value: string, expirationTtl?: number) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values/${key}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'text/plain',
    },
    body: value,
    ...(expirationTtl ? { 
      query: { expiration_ttl: expirationTtl }
    } : {})
  });

  if (!response.ok) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Failed to put value: ${response.statusText}`
        }],
        isError: true
      }
    };
  }

  return {
    toolResult: {
      content: [{
        type: "text",
        text: `Successfully stored value for key: ${key}`
      }],
      isError: false
    }
  };
}

async function handleDelete(key: string) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values/${key}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
    },
  });

  if (!response.ok) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Failed to delete key: ${response.statusText}`
        }],
        isError: true
      }
    };
  }

  return {
    toolResult: {
      content: [{
        type: "text",
        text: `Successfully deleted key: ${key}`
      }],
      isError: false
    }
  };
}

interface CloudflareListResponse {
  result: Array<{
    name: string;
    expiration?: number;
    metadata?: unknown;
  }>;
  success: boolean;
  errors: any[];
  messages: any[];
}

async function handleList(prefix?: string, limit?: number) {
  const params = new URLSearchParams();
  if (prefix) params.append('prefix', prefix);
  if (limit) params.append('limit', limit.toString());

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/keys?${params}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
    },
  });

  if (!response.ok) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Failed to list keys: ${response.statusText}`
        }],
        isError: true
      }
    };
  }

  const data = await response.json() as CloudflareListResponse;
  
  if (!data.success) {
    return {
      toolResult: {
        content: [{
          type: "text",
          text: `Failed to list keys: ${data.errors.join(', ')}`
        }],
        isError: true
      }
    };
  }

  const keys = data.result.map(item => item.name);

  return {
    toolResult: {
      content: [{
        type: "text",
        text: JSON.stringify(keys, null, 2)
      }],
      isError: false
    }
  };
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare KV MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});