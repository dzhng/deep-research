# Open Deep Research

An open-source tool for thorough internet research with LLMs and web crawling.

## Features

- In-depth web-based research
- Recursive exploration based on initial learnings
- Comprehensive reporting
- Breadth and depth configuration
- Direct Notion export support

## Requirements

- Node.js v18 or newer
- API keys for:
  - Firecrawl API (for web search and content extraction)
  - OpenAI API (for o3 mini model)

## Setup

### Node.js

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables in a `.env.local` file:

```bash
FIRECRAWL_KEY="your_firecrawl_key"
# If you want to use your self-hosted Firecrawl, add the following below:
# FIRECRAWL_BASE_URL="http://localhost:3002"

OPENAI_KEY="your_openai_key"
```

To use local LLM, comment out `OPENAI_KEY` and instead uncomment `OPENAI_ENDPOINT` and `OPENAI_MODEL`:

- Set `OPENAI_ENDPOINT` to the address of your local server (eg."http://localhost:1234/v1")
- Set `OPENAI_MODEL` to the name of the model loaded in your local server.

### Docker

1. Clone the repository
2. Rename `.env.example` to `.env.local` and set your API keys

3. Run `docker build -f Dockerfile`

4. Run the Docker image:

```bash
docker compose up -d
```

5. Execute `npm run docker` in the docker service:

```bash
docker exec -it deep-research npm run docker
```

## Usage

Run the research assistant:

```bash
npm start
```

You'll be prompted to:

1. Enter your research query
2. Specify research breadth (recommended: 3-10, default: 4)
3. Specify research depth (recommended: 1-5, default: 2)
4. Answer follow-up questions to refine the research direction

The system will then:

1. Generate and execute search queries
2. Process and analyze search results
3. Recursively explore deeper based on findings
4. Generate a comprehensive markdown report

The final report will be saved as `report.md` or `answer.md` in your working directory, depending on which modes you selected.

### Concurrency

If you have a paid version of Firecrawl or a local version, feel free to increase the `ConcurrencyLimit` by setting the `CONCURRENCY_LIMIT` environment variable so it runs faster.

If you have a free version, you may sometimes run into rate limit errors, you can reduce the limit to 1 (but it will run a lot slower).

### DeepSeek R1

Deep research performs great on R1! We use [Fireworks](http://fireworks.ai) as the main provider for the R1 model. To use R1, simply set a Fireworks API key:

```bash
FIREWORKS_KEY="api_key"
```

The system will automatically switch over to use R1 instead of `o3-mini` when the key is detected.

### Custom endpoints and models

There are 2 other optional env vars that lets you tweak the endpoint (for other OpenAI compatible APIs like OpenRouter or Gemini) as well as the model string.

```bash
OPENAI_ENDPOINT="custom_endpoint"
CUSTOM_MODEL="custom_model"
```

## Notion Integration

The Deep Research tool supports exporting your reports directly to Notion using the official Notion API.

### Setup Steps

1. **Create a Notion integration**
   - Go to [Notion's Integrations page](https://www.notion.so/my-integrations)
   - Click **+ New integration**
   - Name your integration (e.g., "Deep Research Integration")
   - Select the workspace you want to connect to
   - Set the capabilities (at minimum, you need "Read content" and "Insert content")
   - Click **Submit**
   - Copy the **Internal Integration Token** (this will be your NOTION_TOKEN)

2. **Create a Notion page to store your reports**
   - Create a page in Notion where you want your reports to be stored
   - Share the page with your integration:
     - Open the page
     - Click the **...** (three dots) in the top right corner
     - Go to **Add connections**
     - Search for and select your integration
   - Get the Page ID:
     - Open the page in your browser
     - Look at the URL: `https://www.notion.so/[workspace]/[page-id]?v=[view-id]`
     - Copy the page ID (the part between your workspace name and the "?")

3. **Configure environment variables**
   - Update your `.env.local` file with the following variables:
     ```
     # Notion configuration
     NOTION_TOKEN="your_notion_internal_integration_token"
     NOTION_PARENT_PAGE_ID="your_notion_page_id"
     ```

### Using the Notion Export Feature

The Notion export feature is fully integrated into the main workflow. You can use it in the following ways:

1. **During research**: When you run the Deep Research tool with `npm start`, it will ask if you want to export your report to Notion after generating it.

2. **Export existing reports**: You can export existing research reports or answers to Notion without rerunning the research:
   ```
   npm run start -- --export-to-notion report.md
   ```
   For answer files, add the `--answer` flag:
   ```
   npm run start -- --export-to-notion answer.md --answer
   ```

3. **Test Notion integration**: To verify your Notion API credentials without running a full research session:
   ```
   npm run start -- --test-notion
   ```
   This will create a test page in your Notion workspace to confirm everything is working correctly.

### Troubleshooting

If you encounter issues with the Notion integration:

1. Verify that your integration token is correct
2. Make sure your integration has been properly shared with the parent page
3. Check that the page ID is correct
4. Look for error messages in the console output
5. Run the test command to validate your setup: `npm run start -- --test-notion`

## License

MIT License - feel free to use and modify as needed.
