# Contribution Notifications

This project is designed to monitor and analyze pull requests (PRs) for a specified GitHub organization. It provides notifications about new and merged PRs, along with a summary of changes, through Discord and Slack.

## Features

- Monitors multiple repositories within a specified GitHub organization
- Analyzes opened and merged pull requests
- Filters out PRs from bots (e.g., Renovate)
- Sends notifications to Discord and Slack
- Generates a summary of changes
- Caches PR analysis results using LevelDB

## Prerequisites

- [Bun](https://bun.sh) (v1.1.21 or later)
- GitHub Personal Access Token
- Anthropic API Key (for Claude AI analysis)
- Discord Webhook URL (optional)
- Slack Bot Token and Channel ID (optional)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/tscircuit/contribution-notifications.git
   cd contribution-notifications
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root and add the following variables:
   ```
   GITHUB_TOKEN=your_github_token
   ANTHROPIC_API_KEY=your_anthropic_api_key
   DISCORD_WEBHOOK_URL=your_discord_webhook_url
   SLACK_BOT_TOKEN=your_slack_bot_token
   SLACK_CHANNEL_ID=your_slack_channel_id
   GITHUB_ORG=your_github_organization_name
   FULL_REPO_LIST=repo1,repo2,repo3
   ```

## Usage

To run the script:

```bash
bun run index.ts
```

This will:

1. Fetch repositories from the specified GitHub organization
2. Analyze opened and merged PRs from the last hour
3. Send notifications for each PR change
4. Generate and send a summary of all changes

## Customization

- To monitor specific repositories, you can set the `FULL_REPO_LIST` environment variable in your `.env` file:
  - Set `FULL_REPO_LIST=true` to monitor all public repositories in the organization.
  - Set `FULL_REPO_LIST=repo1,repo2,repo3` to monitor specific repositories (comma-separated list).
  - Leave `FULL_REPO_LIST` unset or empty to use the default list of repositories defined in `lib/getRepos.ts`.
- Adjust the time range for fetching PRs by modifying the `Date.now() - 3600000` value in `index.ts`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
