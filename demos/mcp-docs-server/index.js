#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, "docs");

// Create server instance
const server = new Server(
  {
    name: "docs-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// List available documentation resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const files = await fs.readdir(DOCS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  return {
    resources: mdFiles.map((file) => ({
      uri: `docs://${file}`,
      name: `Documentation: ${file.replace(".md", "")}`,
      mimeType: "text/markdown",
      description: `Internal documentation from ${file}`,
    })),
  };
});

// Read a specific documentation file
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const filename = uri.replace("docs://", "");
  const filepath = path.join(DOCS_DIR, filename);

  try {
    const content = await fs.readFile(filepath, "utf-8");
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/markdown",
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to read ${filename}: ${error.message}`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_docs",
        description: "Search through documentation files for specific content",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_weather",
        description:
          "Get current weather for a city using OpenWeatherMap API. Supports city names, 'City, Country' format (e.g., 'London, UK'), or 'City, State, Country' for US cities (e.g., 'Madison, Wisconsin, US')",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description:
                "City name. For best results use: 'City, Country' (e.g., 'Amsterdam, NL') or 'City, State, Country' for US cities (e.g., 'Madison, Wisconsin, US'). State abbreviations (WI, CA) may not work - use full state names.",
            },
          },
          required: ["city"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "search_docs") {
    const query = request.params.arguments.query.toLowerCase();
    const files = await fs.readdir(DOCS_DIR);
    const results = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const content = await fs.readFile(path.join(DOCS_DIR, file), "utf-8");
      if (content.toLowerCase().includes(query)) {
        results.push({
          file,
          content: content,
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "get_weather") {
    const city = request.params.arguments.city;

    // Check for API key - prompt user if not available
    let apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      // For demo purposes, show instructions and use demo data
      return {
        content: [
          {
            type: "text",
            text: `🌤️ Weather Service Setup Required

To get live weather data for ${city}, I need an OpenWeatherMap API key.

**Quick Setup:**
1. Get a free API key: https://openweathermap.org/api
2. Add to your MCP configuration (mcp.json):
   - Add the weatherApiKey input (see demo guide)
   - VS Code will prompt you and store it encrypted
3. Restart VS Code

**For demo purposes, here's sample weather data for ${city}:**
- Temperature: 16°C
- Condition: Partly cloudy
- Humidity: 72%
- Wind: 2.1 m/s
- Pressure: 1013 hPa

*This is simulated data. Set up your API key for real-time weather!* 🔑`,
          },
        ],
      };
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            content: [
              {
                type: "text",
                text: `Could not find weather data for "${city}".

**Tips for better results:**
- Use full city names: "Madison, Wisconsin" instead of "Madison, WI"
- Include country: "Amsterdam, NL" or "Brussels, BE"
- For US cities: "City, State, US" (e.g., "Madison, Wisconsin, US")
- Avoid state abbreviations like WI, CA, NY - use full names

Try rephrasing your query with the full location name!`,
              },
            ],
          };
        }
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      const weatherInfo = {
        city: data.name,
        country: data.sys.country,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
      };

      return {
        content: [
          {
            type: "text",
            text: `Current weather in ${weatherInfo.city}, ${weatherInfo.country}:
- Temperature: ${weatherInfo.temperature}°C
- Condition: ${weatherInfo.description}
- Humidity: ${weatherInfo.humidity}%
- Wind: ${weatherInfo.windSpeed} m/s`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching weather for ${city}: ${error.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Docs MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
