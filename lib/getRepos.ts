import { octokit } from "../index";

export async function getRepos(): Promise<string[]> {
	const org = process.env.GITHUB_ORG;

	if (!org) {
		throw new Error("GITHUB_ORG environment variable is not set");
	}

	if (
		process.env.FULL_REPO_LIST === "true" ||
		process.env.FULL_REPO_LIST === "all"
	) {
		return await octokit.rest.repos
			.listForOrg({
				org,
				type: "public",
				per_page: 100,
			})
			.then((res) => res.data.map((repo) => repo.full_name));
	}
	if (process.env.FULL_REPO_LIST) {
		// If FULL_REPO_LIST is set but not "true", treat it as a comma-separated list of repos
		return process.env.FULL_REPO_LIST.split(",")
			.map((repo) => repo.trim())
			.map((repo) => `${org}/${repo}`);
	}

	throw new Error(
		'FULL_REPO_LIST environment variable is not set, for all repos set to "true" or "all"',
	);
}
