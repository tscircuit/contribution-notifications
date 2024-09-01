import { Octokit } from "@octokit/rest"
import Anthropic from "@anthropic-ai/sdk"
import { Level } from "level"
import type { PullRequest } from "./getMergedPRs"
import { filterDiff } from "./filterDiff"
import type { AnalyzedPR } from "../index"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Initialize LevelDB
const db = new Level("./pr-analysis-cache", { valueEncoding: "json" })

export async function analyzePRWithClaude(
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

    const content = (message.content[0] as any).text ?? ""
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
