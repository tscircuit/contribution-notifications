import { octokit } from "../index"

export async function getRepos(): Promise<string[]> {
  const org = process.env.GITHUB_ORG

  if (!org) {
    throw new Error("GITHUB_ORG environment variable is not set")
  }

  if (process.env.FULL_REPO_LIST === "true") {
    return await octokit.rest.repos
      .listForOrg({
        org,
        type: "public",
        per_page: 100,
      })
      .then((res) => res.data.map((repo) => repo.full_name))
  } else if (process.env.FULL_REPO_LIST) {
    // If FULL_REPO_LIST is set but not "true", treat it as a comma-separated list of repos
    return process.env.FULL_REPO_LIST.split(",").map((repo) => repo.trim())
  }

  // Default list of repositories if FULL_REPO_LIST is not set
  return [
    `${org}/tscircuit`,
    `${org}/cli`,
    `${org}/react-fiber`,
    `${org}/builder`,
    `${org}/schematic-viewer`,
    `${org}/pcb-viewer`,
    `${org}/3d-viewer`,
    `${org}/soup`,
    `${org}/props`,
    `${org}/jscad-fiber`,
  ]
}
