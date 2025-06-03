# Contribution Notifications (ARCHIVED)

This code has been moved to the [contribution-tracker](https://github.com/tscircuit/contribution-tracker)

---

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
   HTTP_WEBHOOK_URL=your_http_webhook_url
   GITHUB_ORG=your_github_organization_name
   FULL_REPO_LIST=repo1,repo2,repo3
   ```

   Note: The `HTTP_WEBHOOK_URL` is optional. If provided, the script will send notifications to this URL as well.

## Usage

### Running Locally

To run the script locally:

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

## Setting up GitHub Workflow

To set up a GitHub workflow that uses contribution-notifications:

1. Create a new file in your repository at `.github/workflows/contribution-notifications.yml`
2. Add the following content to the file:

   ```yaml
   name: Contribution Notifications

   on:
     schedule:
       - cron: '0 * * * *'  # Run every hour
     workflow_dispatch:  # Allow manual triggering

   jobs:
     run-notifications:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: oven-sh/setup-bun@v1
           with:
             bun-version: latest
         - name: Run contribution-notifications
           uses: tscircuit/contribution-notifications@main
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
             DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
             SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
             SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
             HTTP_WEBHOOK_URL: ${{ secrets.HTTP_WEBHOOK_URL }}
             GITHUB_ORG: your_github_organization_name
             FULL_REPO_LIST: 'true'
   ```

3. Replace `your_github_organization_name` with your actual GitHub organization name.
4. Set up the necessary secrets in your GitHub repository settings:
   - `ANTHROPIC_API_KEY`
   - `DISCORD_WEBHOOK_URL` (if using Discord notifications)
   - `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` (if using Slack notifications)
   - `HTTP_WEBHOOK_URL` (if using HTTP webhook notifications)

This workflow will run the contribution-notifications script every hour and can also be triggered manually.

## License

This project is open source and available under the [MIT License](LICENSE).
