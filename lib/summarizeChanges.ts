import Anthropic from "@anthropic-ai/sdk"
import type { AnalyzedPR } from "../index"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function summarizeChanges(prs: AnalyzedPR[]) {
  const prompt = `Summarize the following pull requests:

${prs.map((pr) => `- ${pr.title} (${pr.impact} impact): ${pr.description}`).join("\n")}

Provide a concise summary of the overall changes and their significance.`

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  })

  return (message.content[0] as any).text ?? ""
}
