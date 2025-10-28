# Docs MCP Server

A Model Context Protocol (MCP) server that provides access to documentation files and weather information. This server enables AI assistants to search through local documentation and fetch current weather data for any city.

## Features

- **Documentation Search**: Search through local Markdown documentation files
- **Weather Information**: Get current weather data for any city using OpenWeatherMap API
- **Resource Access**: Browse and read documentation files as MCP resources

## Tools

### search_docs

Search through documentation files for specific content.

**Parameters:**

- `query` (string, required): Search query string

### get_weather

Get current weather for a city using OpenWeatherMap API.

**Parameters:**

- `city` (string, required): City name. For best results use:
  - 'City, Country' format (e.g., 'Amsterdam, NL')
  - 'City, State, Country' for US cities (e.g., 'Madison, Wisconsin, US')
  - Avoid state abbreviations - use full state names

## Resources

The server exposes all Markdown files in the `docs/` directory as MCP resources with the URI format `docs://filename.md`.

## Setup

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

1. (Optional) Set up weather API:
   - Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
   - Set the `WEATHER_API_KEY` environment variable or configure it in your MCP client

### Running the Server

```bash
node index.js
```

The server runs on stdio transport and communicates via standard input/output.

### Testing with MCP Inspector

Use the MCP Inspector to test and debug your server interactively:

```bash
npx @modelcontextprotocol/inspector node index.js
```

The MCP Inspector provides a web interface where you can:

- **Browse Resources**: View all available documentation files
- **Test Tools**: Execute `search_docs` and `get_weather` tools with different parameters
- **Debug Communication**: See the raw MCP protocol messages
- **Validate Responses**: Ensure your server responds correctly to different requests

This is especially useful for:

- Testing weather API functionality with different city formats
- Verifying documentation search results
- Debugging tool parameter validation
- Ensuring proper error handling

The inspector will start a local web server (typically on `http://localhost:5173`) where you can interact with your MCP server through a user-friendly interface.

## MCP Configuration

To use this server with an MCP client (like VS Code with GitHub Copilot), add it to your MCP configuration:

```json
{
  "mcpServers": {
    "docs-server": {
      "command": "node",
      "args": ["/path/to/your/mcp-docs-server/index.js"],
      "env": {
        "WEATHER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Documentation Structure

Place your documentation files in the `docs/` directory. The server will automatically discover and index all `.md` files for searching and resource access.

Example structure:

```text
docs/
├── authentication.md
├── database-schema.md
└── weather-api.md
```

## Weather API Setup

### Without API Key

The server will work without an API key but will return demo/sample weather data with setup instructions.

### With API Key

1. Sign up for a free account at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your API key
3. Set it as an environment variable:

   ```bash
   export WEATHER_API_KEY=your_api_key_here
   ```

4. Or configure it in your MCP client configuration

## Error Handling

- **Documentation Search**: Returns empty results if no matches found
- **Weather API**: Provides helpful error messages for invalid cities or API issues
- **File Access**: Returns appropriate error messages for missing or inaccessible files

## Development

The server is built using the Model Context Protocol SDK and includes:

- Resource management for documentation files
- Tool handlers for search and weather functionality
- Proper error handling and user feedback
- Support for both live and demo weather data
