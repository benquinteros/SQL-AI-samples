# MSSQL Database MCP Server

<div align="center">
  <img src="./src/img/logo.png" alt="MSSQL Database MCP server logo" width="400"/>
</div>

> ⚠️ **EXPERIMENTAL USE ONLY** - This MCP Server is provided as an example for educational and experimental purposes only. It is NOT intended for production use. Please use appropriate security measures and thoroughly test before considering any kind of deployment.

> **📢 FORK NOTICE**: This is a modified version of the original MSSQL MCP Server with **Windows Authentication support** and **read-only mode for safety**. See [FORK_CHANGES.md](../FORK_CHANGES.md) for detailed information about the changes.

## What is this? 🤔

This is a server that lets your LLMs (like Claude) talk directly to your MSSQL Database data! Think of it as a friendly translator that sits between your AI assistant and your database, making sure they can chat securely and efficiently.

### Quick Example

```text
You: "Show me all customers from New York"
Claude: *queries your MSSQL Database database and gives you the answer in plain English*
```

## How Does It Work? 🛠️

This server leverages the Model Context Protocol (MCP), a versatile framework that acts as a universal translator between AI models and databases. It supports multiple AI assistants including Claude Desktop and VS Code Agent.

### What Can It Do? 📊

- **Windows Authentication Support**: Native support for Windows Authentication (NTLM) for connecting to SQL Server instances.
- Run MSSQL Database queries by just asking questions in plain English
- Read and query data from tables
- List all tables in the database
- Describe table schemas with detailed column information
- Secure connection handling with support for Windows, SQL Server, and Azure AD authentication
- **Safety First**: Write operations (Create, Update, Delete) have been removed to prevent accidental data modification or deletion. This server is **read-only** for safety.

## Quick Start 🚀

### Prerequisites

- Node.js 14 or higher
- Claude Desktop or VS Code with Agent extension

### Set up project

1. **Install Dependencies**  
   Run the following command in the root folder to install all necessary dependencies:

   ```bash
   npm install
   ```

2. **Build the Project**  
   Compile the project by running:
   ```bash
   npm run build
   ```

## Configuration Setup

### Option 1: VS Code Agent Setup

1. **Install VS Code Agent Extension**

   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Agent" and install the official Agent extension

2. **Create MCP Configuration File**

   - Create a `.vscode/mcp.json` file in your workspace
   - Add the following configuration:

   ```json
   {
     "servers": {
       "mssql-nodejs": {
         "type": "stdio",
         "command": "node",
         "args": ["q:\\Repos\\SQL-AI-samples\\MssqlMcp\\Node\\dist\\index.js"],
         "env": {
           "SERVER_NAME": "your-server-name.database.windows.net",
           "DATABASE_NAME": "your-database-name",
           "READONLY": "false"
         }
       }
     }
   }
   ```

3. **Alternative: User Settings Configuration**
   - Open VS Code Settings (Ctrl+,)
   - Search for "mcp"
   - Click "Edit in settings.json"
   - Add the following configuration:

```json
{
  "mcp": {
    "servers": {
      "mssql": {
        "command": "node",
        "args": ["C:/path/to/your/Node/dist/index.js"],
        "env": {
          "SERVER_NAME": "your-server-name.database.windows.net",
          "DATABASE_NAME": "your-database-name",
          "READONLY": "false"
        }
      }
    }
  }
}
```

4. **Restart VS Code**

   - Close and reopen VS Code for the changes to take effect

5. **Verify MCP Server**
   - Open Command Palette (Ctrl+Shift+P)
   - Run "MCP: List Servers" to verify your server is configured
   - You should see "mssql" in the list of available servers

### Option 2: Claude Desktop Setup

1. **Open Claude Desktop Settings**

   - Navigate to File → Settings → Developer → Edit Config
   - Open the `claude_desktop_config` file

2. **Add MCP Server Configuration**
   Replace the content with the configuration below, updating the path and credentials:

   ```json
   {
     "mcpServers": {
       "mssql": {
         "command": "node",
         "args": ["C:/path/to/your/Node/dist/index.js"],
         "env": {
           "SERVER_NAME": "your-server-name.database.windows.net",
           "DATABASE_NAME": "your-database-name",
           "READONLY": "false"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**
   - Close and reopen Claude Desktop for the changes to take effect

### Configuration Parameters

- **SERVER_NAME**: Your MSSQL Database server name (e.g., `my-server.database.windows.net` or `.` for local server)
- **DATABASE_NAME**: Your database name
- **AUTH_TYPE**: Authentication type - `"windows"`, `"sql"`, or `"azure-ad"` (default: `"azure-ad"`)
  - **Windows Authentication** (`"windows"`): Uses Windows Authentication (NTLM) - ideal for local SQL Server instances
    - **DOMAIN**: (Optional) Windows domain name
    - **USERNAME**: (Optional) Windows username
    - **PASSWORD**: (Optional) Windows password
    - _If DOMAIN, USERNAME, and PASSWORD are not provided, the current Windows user credentials will be used_
  - **SQL Server Authentication** (`"sql"`): Uses SQL Server username/password authentication
    - **SQL_USER**: SQL Server username (required)
    - **SQL_PASSWORD**: SQL Server password (required)
  - **Azure AD Authentication** (`"azure-ad"`): Uses Azure Active Directory interactive authentication (default)
- **PORT**: (Optional) Server port number (default: 1433)
- **READONLY**: Set to `"true"` to restrict to read-only operations, `"false"` for full access. _Note: This fork has write operations disabled for safety._
- **CONNECTION_TIMEOUT**: (Optional) Connection timeout in seconds. Defaults to `30` if not set.
- **TRUST_SERVER_CERTIFICATE**: (Optional) Set to `"true"` to trust self-signed server certificates (useful for development or when connecting to servers with self-signed certs). Defaults to `"false"`.

### Example Configurations

**Windows Authentication (Local SQL Server)**:

```json
{
  "command": "node",
  "args": ["C:/path/to/your/Node/dist/index.js"],
  "env": {
    "SERVER_NAME": ".",
    "DATABASE_NAME": "test",
    "AUTH_TYPE": "windows",
    "TRUST_SERVER_CERTIFICATE": "true"
  }
}
```

**Windows Authentication with Explicit Credentials**:

```json
{
  "command": "node",
  "args": ["C:/path/to/your/Node/dist/index.js"],
  "env": {
    "SERVER_NAME": "my-server",
    "DATABASE_NAME": "test",
    "AUTH_TYPE": "windows",
    "DOMAIN": "MYDOMAIN",
    "USERNAME": "myuser",
    "PASSWORD": "mypassword"
  }
}
```

**SQL Server Authentication**:

```json
{
  "command": "node",
  "args": ["C:/path/to/your/Node/dist/index.js"],
  "env": {
    "SERVER_NAME": "my-server.database.windows.net",
    "DATABASE_NAME": "mydb",
    "AUTH_TYPE": "sql",
    "SQL_USER": "sqladmin",
    "SQL_PASSWORD": "your_password"
  }
}
```

**Azure AD Authentication (Azure SQL Database)**:

```json
{
  "command": "node",
  "args": ["C:/path/to/your/Node/dist/index.js"],
  "env": {
    "SERVER_NAME": "my-server.database.windows.net",
    "DATABASE_NAME": "mydb",
    "AUTH_TYPE": "azure-ad"
  }
}
```

## Usage Examples

Once configured, you can interact with your database using natural language:

- "Show me all users from New York"
- "List all tables in the database"
- "Describe the structure of the products table"
- "What are the column names and types in the customers table?"

## Security Notes

- This server is configured in **read-only mode** for safety - all write operations have been removed
- Set `READONLY: "true"` in your configuration to ensure read-only access
- Windows Authentication provides integrated security for local SQL Server instances
- For Azure SQL Database, use Azure AD authentication for enhanced security

You should now have successfully configured the MCP server for MSSQL Database with your preferred AI assistant. This setup allows you to seamlessly interact with MSSQL Database through natural language queries!
