import { octokit } from "../index"

async function getAllRepos(org: string): Promise<string[]> {
  const repos: string[] = []
  let page = 1

  while (true) {
    const response = await octokit.rest.repos.listForOrg({
      org,
      type: "public",
      per_page: 100,
      page,
      sort: "updated",
    })

    const newRepos = response.data.map((repo) => repo.full_name)
    repos.push(...newRepos)

    if (newRepos.length < 100) {
      break
    }

    page++
  }

  return repos
}

export async function getRepos(): Promise<string[]> {
  const org = process.env.GITHUB_ORG

  if (!org) {
    throw new Error("GITHUB_ORG environment variable is not set")
  }

  if (
    process.env.FULL_REPO_LIST === "true" ||
    process.env.FULL_REPO_LIST === "all"
  ) {
    return await getAllRepos(org)
  }

  if (process.env.FULL_REPO_LIST) {
    // If FULL_REPO_LIST is set but not "true", treat it as a comma-separated list of repos
    return process.env.FULL_REPO_LIST.split(",")
      .map((repo) => repo.trim())
      .map((repo) => `${org}/${repo}`)
  }

  throw new Error(
    'FULL_REPO_LIST environment variable is not set, for all repos set to "true" or "all"',
  )
}
