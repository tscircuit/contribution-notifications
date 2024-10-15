import { Octokit } from "@octokit/rest"
import { WebhookClient } from "discord.js"
import { getRepos } from "../lib/getRepos"

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

const discordWebhook = new WebhookClient({ url: process.env.ISSUES_DISCORD_WEBHOOK_URL || "" })

interface Issue {
  number: number
  title: string
  html_url: string
  user: {
    login: string
  }
  created_at: string
}

async function getRecentIssues(repo: string): Promise<Issue[]> {
  const [owner, repoName] = repo.split("/")
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo: repoName,
    state: "open",
    since: sixtyMinutesAgo,
    sort: "created",
    direction: "desc",
  })

  return data.filter((issue) => !issue.pull_request) as Issue[]
}

async function notifyDiscord(issue: Issue, repo: string) {
  const message = `New issue in ${repo}: [#${issue.number} ${issue.title}](${issue.html_url}) by ${issue.user.login}`
  await discordWebhook.send(message)
}

async function main() {
  const repos = await getRepos()

  for (const repo of repos) {
    console.log(`Checking issues for ${repo}`)
    const recentIssues = await getRecentIssues(repo)

    for (const issue of recentIssues) {
      await notifyDiscord(issue, repo)
    }
  }
}

main().catch(console.error)
