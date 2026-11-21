# ReRoute MCP Connector

ReRoute provides a read-only MCP server for ChatGPT. The server runs locally over stdio; OpenAI Secure MCP Tunnel forwards requests without requiring a public endpoint. The app and its catalog stay on the local machine.

## Available tools

- `search_catalog`: search product text and optionally filter by store or category.
- `list_stores`: return stores and measured detour data.
- `match_grocery_items`: match up to 100 list lines against the catalog. Results include the app's confidence label and matching method.
- `plan_grocery_trip`: match grocery list lines with quantities, then calculate recommended, cheapest single-store, and fastest plans. `preference` must be `fastest`, `balanced`, or `maxSavings`.

The tools do not read or change browser preferences, saved lists, or local storage. A plan uses ReRoute's usual store and catalog. Each result includes the app's price-source note. An item with no catalog match or no compatible store is reported as missing and never priced as zero.

## Run locally

Install dependencies, fill measured `detour_minutes` and `detour_miles` in `data/raw/stores.csv`, generate `data/stores.json` and `data/products.json` from the raw CSVs if they are missing, and start the server:

```sh
npm install
npm run import-data
npm run mcp
```

The MCP process writes protocol messages to stdout. Keep diagnostics on stderr; do not pipe other commands or status output into the MCP process.

## Connect through Secure MCP Tunnel

1. Create or select an OpenAI Secure MCP Tunnel in Platform settings. Associate it with the Platform organization and the ChatGPT workspace that will use ReRoute. The operator needs tunnel use permission.
2. Download the current `tunnel-client` release. Create a restricted runtime API key with **Tunnels Read + Use**, and store it in the ignored `.env.local` as `CONTROL_PLANE_API_KEY`. The MCP tunnel ID is `OPENAI_TUNNEL_ID` in `.env.local`; tunnel-client receives it with `--tunnel-id`. Do not use an admin key as the runtime key.
3. Load the local environment and initialize a profile from the repository root. In zsh or bash, run `set -a; source .env.local; set +a` first so tunnel-client receives both values:

   ```sh
   tunnel-client init \
     --sample sample_mcp_stdio_local \
     --profile reroute-local \
     --tunnel-id "$OPENAI_TUNNEL_ID" \
     --mcp-command "npm run mcp" \
     --control-plane-api-key-ref "env:CONTROL_PLANE_API_KEY"
   tunnel-client doctor --profile reroute-local --explain
   ```

4. Start and keep the tunnel client running:

   ```sh
   tunnel-client run --profile reroute-local
   ```

5. In ChatGPT, add a custom MCP server, choose **Tunnel**, select the same tunnel, and create the connection. Use the tunnel client's local health/readiness page and a call to `list_stores` to verify the path.

Use the latest `tunnel-client` release and confirm flags with `tunnel-client help quickstart`, because tunnel tooling can change. Do not commit the local profile if it contains credentials or tunnel identity. The tunnel does not replace ChatGPT workspace access controls.

For current tunnel requirements and permissions, see [OpenAI Secure MCP Tunnel documentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).
