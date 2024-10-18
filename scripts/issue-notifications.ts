import { Octokit } from "@octokit/rest"
import { WebhookClient, MessageCreateOptions } from "discord.js"
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

  return data.filter((issue) => !issue.pull_request && new Date(issue.created_at) >= new Date(sixtyMinutesAgo)) as Issue[]
}

async function notifyDiscord(issues: Issue[], repo: string) {
  if (issues.length === 0) return

  const messageContent = `New issues in ${repo}:\n` + 
    issues.map(issue => `• #${issue.number} ${issue.title} by ${issue.user.login} - <${issue.html_url}>`).join('\n')

  const messageOptions: MessageCreateOptions = {
    content: messageContent,
    allowedMentions: { parse: [] }  // This prevents link previews
  }

  await discordWebhook.send(messageOptions)
}

async function main() {
  const repos = await getRepos()
  const allIssues: { [repo: string]: Issue[] } = {}

  for (const repo of repos) {
    console.log(`Checking issues for ${repo}`)
    const recentIssues = await getRecentIssues(repo)
    if (recentIssues.length > 0) {
      allIssues[repo] = recentIssues
    }
  }

  for (const [repo, issues] of Object.entries(allIssues)) {
    await notifyDiscord(issues, repo)
  }
}

main().catch(console.error)
