import { Octokit } from "@octokit/rest"
import { getRepos } from "./lib/getRepos"
import {
  getMergedPRs,
  getOpenedPRs,
  type PullRequest,
} from "./lib/getMergedPRs"
import { analyzePRWithClaude } from "./lib/analyzePR"
import { notifyPRChange } from "./lib/notifyPRChange"
import { summarizeChanges } from "./lib/summarizeChanges"

export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

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

    await notifyPRChange({
      number: 0,
      title: "Summary of changes",
      description: summaryMessage,
      impact: "Minor",
      contributor: "bot",
      repo: "summary",
      url: "",
      state: "opened",
    })
  } else {
    console.log("No opened or merged PRs in the last hour. No messages sent.")
  }
}

// Run the script
main().catch(console.error)
