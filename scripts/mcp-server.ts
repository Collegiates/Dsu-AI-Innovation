import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRerouteMcpServer } from "@/mcp/server";

/** Starts ReRoute's private MCP process on stdio for OpenAI Secure MCP Tunnel to connect to. */
async function main(): Promise<void> {
  const server = createRerouteMcpServer();
  await server.connect(new StdioServerTransport());
}

main().catch(() => {
  console.error("ReRoute MCP server could not start. Check the local catalog and server configuration.");
  process.exitCode = 1;
});
