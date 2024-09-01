import { Octokit } from "@octokit/rest"
import * as fs from "node:fs"
import Anthropic from "@anthropic-ai/sdk"
import { Level } from "level"
import { getRepos } from "./lib/getRepos"
import {
  getMergedPRs,
  getOpenedPRs,
  type PullRequest,
} from "./lib/getMergedPRs"
import { filterDiff } from "./lib/filterDiff"
import { WebhookClient } from "discord.js"
import { WebClient } from "@slack/web-api"

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Initialize LevelDB
const db = new Level("./pr-analysis-cache", { valueEncoding: "json" })

// Initialize Discord webhook client if the environment variable is set
let discordWebhook: WebhookClient | null = null
if (process.env.DISCORD_WEBHOOK_URL) {
  discordWebhook = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL })
} else {
  console.warn(
    "Discord webhook URL not set. Discord notifications will be skipped.",
  )
}

// Initialize Slack client if the environment variable is set
let slackClient: WebClient | null = null
if (process.env.SLACK_BOT_TOKEN) {
  slackClient = new WebClient(process.env.SLACK_BOT_TOKEN)
} else {
  console.warn("Slack bot token not set. Slack notifications will be skipped.")
}

export interface AnalyzedPR {
  number: number
  title: string
  description: string
  impact: "Major" | "Minor" | "Tiny"
  contributor: string
  repo: string
  url: string
  state: "merged" | "opened"
}

async function analyzePRWithClaude(
  pr: PullRequest,
  repo: string,
  state: "merged" | "opened",
): Promise<AnalyzedPR> {
  const cacheKey = `${repo}:${pr.number}`

  try {
    // Try to get the analysis from cache
    const cachedAnalysis = JSON.parse(
      await db.get(cacheKey, { valueEncoding: "json" }),
    )
    return cachedAnalysis
  } catch (error) {
    const reducedDiff = filterDiff(pr.diff)

    // If not in cache, perform the analysis
    const prompt = `Analyze the following pull request and provide a one-line description of the change. Also, classify the impact as "Major", "Minor", or "Tiny".

Major Impact: Introduce a feature, fix a bug, improve performance, or refactor code.
Minor Impact: Minor bug fixes, easy feature additions, small improvements. Typically more than 30 lines of code changes.
Tiny Impact: Minor documentation changes, typo fixes, small cosmetic fixes, updates to dependencies.

Title: ${pr.title}
Body: ${pr.body}
Diff:
${reducedDiff.slice(0, 8000)}

Response format:
Description: [One-line description]
Impact: [Major/Minor/Tiny]`

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })

    const content = message.content[0].text
    const description =
      content.split("Description:")?.[1]?.split("Impact:")[0] ?? ""
    const impact = content.split("Impact:")?.[1] ?? ""

    const analysis: AnalyzedPR = {
      number: pr.number,
      title: pr.title,
      description: description.replace("Description: ", "").trim(),
      impact: impact?.replace("Impact: ", "")?.trim() as
        | "Major"
        | "Minor"
        | "Tiny",
      contributor: pr.user.login,
      repo,
      url: pr.html_url,
      state,
    }

    // Store the analysis in cache
    await db.put(cacheKey, analysis, { valueEncoding: "json" })

    return analysis
  }
}
async function postToDiscord(message: string) {
  if (discordWebhook) {
    await discordWebhook.send(message)
  }
}

async function postToSlack(message: string) {
  if (slackClient && process.env.SLACK_CHANNEL_ID) {
    await slackClient.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: message,
    })
  } else if (slackClient && !process.env.SLACK_CHANNEL_ID) {
    console.warn("Slack channel ID not set. Slack message not sent.")
  }
}

async function notifyPRChange(pr: AnalyzedPR) {
  const message = `
New ${pr.state === "merged" ? "merged" : "opened"} PR in ${pr.repo}:
Title: ${pr.title}
Description: ${pr.description}
Impact: ${pr.impact}
Contributor: ${pr.contributor}
URL: ${pr.url}
  `.trim()

  await postToDiscord(message)
  await postToSlack(message)
}

async function summarizeChanges(prs: AnalyzedPR[]) {
  const prompt = `Summarize the following pull requests:

${prs.map((pr) => `- ${pr.title} (${pr.impact} impact): ${pr.description}`).join("\n")}

Provide a concise summary of the overall changes and their significance.`

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  })

  return message.content[0].text
}

async function main() {
  const repos = await getRepos()
  const allPRs: AnalyzedPR[] = []

  for (const repo of repos) {
    console.log(`Analyzing ${repo}`)
    const mergedPRs = await getMergedPRs(
      repo,
      new Date(Date.now() - 3600000).toISOString(),
    )
    const openedPRs = await getOpenedPRs(
      repo,
      new Date(Date.now() - 3600000).toISOString(),
    )

    for (const pr of [...mergedPRs, ...openedPRs]) {
      if (pr.user.login.includes("renovate")) {
        continue
      }
      const analysis = await analyzePRWithClaude(
        pr,
        repo,
        pr.merged_at ? "merged" : "opened",
      )
      allPRs.push(analysis)
      await notifyPRChange(analysis)
    }
  }

  if (allPRs.length > 0) {
    const summary = await summarizeChanges(allPRs)
    const summaryMessage = `
Summary of changes in the last hour:

${summary}

Total PRs: ${allPRs.length}
Merged: ${allPRs.filter((pr) => pr.state === "merged").length}
Opened: ${allPRs.filter((pr) => pr.state === "opened").length}
    `.trim()

    await postToDiscord(summaryMessage)
    await postToSlack(summaryMessage)
  } else {
    console.log("No opened or merged PRs in the last hour. No messages sent.")
  }

  // Close the database
  await db.close()
}

// Run the script
main().catch(console.error)
