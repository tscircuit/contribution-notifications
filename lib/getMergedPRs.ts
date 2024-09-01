import { octokit } from "../index"
import axios from "axios"

export interface PullRequest {
  number: number
  title: string
  body: string
  user: {
    login: string
  }
  html_url: string
  created_at: string
  merged_at: string
  diff: string // New property to store the diff content
}

export async function getMergedPRs(
  repo: string,
  since: string,
): Promise<PullRequest[]> {
  const [owner, repo_name] = repo.split("/")
  const { data } = await octokit.pulls.list({
    owner,
    repo: repo_name,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  })

  const filteredPRs = data.filter(
    (pr) => pr.merged_at && new Date(pr.merged_at) >= new Date(since),
  )

  return await fetchPRsWithDiff(owner, repo_name, filteredPRs)
}

export async function getOpenedPRs(
  repo: string,
  since: string,
): Promise<PullRequest[]> {
  const [owner, repo_name] = repo.split("/")
  const { data } = await octokit.pulls.list({
    owner,
    repo: repo_name,
    state: "open",
    sort: "created",
    direction: "desc",
    per_page: 100,
  })

  const filteredPRs = data.filter(
    (pr) => new Date(pr.created_at) >= new Date(since),
  )

  return await fetchPRsWithDiff(owner, repo_name, filteredPRs)
}

async function fetchPRsWithDiff(
  owner: string,
  repo_name: string,
  prs: any[],
): Promise<PullRequest[]> {
  // Fetch diff content for each PR
  const prsWithDiff = await Promise.all(
    prs.map(async (pr) => {
      const { data: diffData } = await octokit.pulls.get({
        owner,
        repo: repo_name,
        pull_number: pr.number,
        mediaType: {
          format: "diff",
        },
      })

      return {
        ...pr,
        diff: diffData as unknown as string,
      }
    }),
  )

  return prsWithDiff as PullRequest[]
}
