#!/usr/bin/env node

// External imports
import * as dotenv from "dotenv";
import sql from "mssql";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Internal imports
import { ReadDataTool } from "./tools/ReadDataTool.js";
import { ListTableTool } from "./tools/ListTableTool.js";
import {
  DefaultAzureCredential,
  InteractiveBrowserCredential,
} from "@azure/identity";
import { DescribeTableTool } from "./tools/DescribeTableTool.js";

// MSSQL Database connection configuration
// const credential = new DefaultAzureCredential();

// Globals for connection and token reuse
let globalSqlPool: sql.ConnectionPool | null = null;
let globalAccessToken: string | null = null;
let globalTokenExpiresOn: Date | null = null;

// Function to create SQL config based on authentication type
export async function createSqlConfig(): Promise<{
  config: sql.config;
  token?: string;
  expiresOn?: Date;
}> {
  const trustServerCertificate =
    process.env.TRUST_SERVER_CERTIFICATE?.toLowerCase() === "true";
  const connectionTimeout = process.env.CONNECTION_TIMEOUT
    ? parseInt(process.env.CONNECTION_TIMEOUT, 10)
    : 30;
  const authType = process.env.AUTH_TYPE?.toLowerCase() || "azure-ad";
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;

  let config: sql.config = {
    server: process.env.SERVER_NAME!,
    port: port,
    database: process.env.DATABASE_NAME,
    options: {
      encrypt: authType === "azure-ad",
      trustServerCertificate,
    },
    connectionTimeout: connectionTimeout * 1000, // convert seconds to milliseconds
  };

  if (authType === "windows") {
    // Windows Authentication
    config.authentication = {
      type: "ntlm",
      options: {
        domain: process.env.DOMAIN || "",
        userName: process.env.USERNAME || "",
        password: process.env.PASSWORD || "",
      },
    };
    return { config };
  } else if (authType === "sql") {
    // SQL Server Authentication
    config.user = process.env.SQL_USER!;
    config.password = process.env.SQL_PASSWORD!;
    return { config };
  } else {
    // Azure AD Authentication (default)
    const credential = new InteractiveBrowserCredential({
      redirectUri: "http://localhost",
    });
    const accessToken = await credential.getToken(
      "https://database.windows.net/.default"
    );

    config.options!.encrypt = true;
    config.authentication = {
      type: "azure-active-directory-access-token",
      options: {
        token: accessToken?.token!,
      },
    };

    return {
      config,
      token: accessToken?.token!,
      expiresOn: accessToken?.expiresOnTimestamp
        ? new Date(accessToken.expiresOnTimestamp)
        : new Date(Date.now() + 30 * 60 * 1000),
    };
  }
}

const readDataTool = new ReadDataTool();
const listTableTool = new ListTableTool();
const describeTableTool = new DescribeTableTool();

const server = new Server(
  {
    name: "mssql-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Read READONLY env variable
const isReadOnly = process.env.READONLY === "true";

// Request handlers

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: isReadOnly
    ? [listTableTool, readDataTool, describeTableTool] // todo: add searchDataTool to the list of tools available in readonly mode once implemented
    : [readDataTool, describeTableTool, listTableTool], // Only read-only tools available for safety
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    switch (name) {
      case readDataTool.name:
        result = await readDataTool.run(args);
        break;
      case listTableTool.name:
        result = await listTableTool.run(args);
        break;
      case describeTableTool.name:
        if (!args || typeof args.tableName !== "string") {
          return {
            content: [
              {
                type: "text",
                text: `Missing or invalid 'tableName' argument for describe_table tool.`,
              },
            ],
            isError: true,
          };
        }
        result = await describeTableTool.run(args as { tableName: string });
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error occurred: ${error}` }],
      isError: true,
    };
  }
});

// Server startup
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Fatal error running server:", error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

// Connect to SQL only when handling a request

async function ensureSqlConnection() {
  const authType = process.env.AUTH_TYPE?.toLowerCase() || "azure-ad";

  // For Azure AD, check token validity and reuse connection if possible
  if (authType === "azure-ad") {
    if (
      globalSqlPool &&
      globalSqlPool.connected &&
      globalAccessToken &&
      globalTokenExpiresOn &&
      globalTokenExpiresOn > new Date(Date.now() + 2 * 60 * 1000) // 2 min buffer
    ) {
      return;
    }
  } else {
    // For Windows/SQL auth, reuse existing connection if available
    if (globalSqlPool && globalSqlPool.connected) {
      return;
    }
  }

  // Get config (and token for Azure AD)
  const { config, token, expiresOn } = await createSqlConfig();

  if (authType === "azure-ad") {
    globalAccessToken = token!;
    globalTokenExpiresOn = expiresOn!;
  }

  // Close old pool if exists
  if (globalSqlPool && globalSqlPool.connected) {
    await globalSqlPool.close();
  }

  globalSqlPool = await sql.connect(config);
}

// Patch all tool handlers to ensure SQL connection before running
function wrapToolRun(tool: { run: (...args: any[]) => Promise<any> }) {
  const originalRun = tool.run.bind(tool);
  tool.run = async function (...args: any[]) {
    await ensureSqlConnection();
    return originalRun(...args);
  };
}

[readDataTool, listTableTool, describeTableTool].forEach(wrapToolRun);
