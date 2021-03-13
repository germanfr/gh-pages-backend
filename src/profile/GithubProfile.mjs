import fetch from 'node-fetch';
import { graphql } from '@octokit/graphql';

const API = {
	url: 'https://api.github.com',
	mediaType: 'application/vnd.github.v3+json',
};


const STORAGE_KEYS = {
	repos: 'github-repos-cache',
	yearContributions: year => `github-contributions-${year}-cache`,
}

export class GithubProfile {
	constructor(username, token, cache) {
		this.username = username;
		this.cache = cache;
		this.token = token;
	}

	repos() {
		return this.cache.get(STORAGE_KEYS.repos, {
			fetch: this.fetchRepos.bind(this),
			isValid: repos => repos && repos.length > 0,
		});
	}

	async ownRepos() {
		// return this.repos();
		const githubPagesUrl = this.username + '.github.io';
		let repos = await this.repos();
		let filtered = [];
		for (let repo of repos) {
			// Return only relevat repositories
			if ((repo.stargazers_count || !repo.fork) && repo.name !== githubPagesUrl && !repo.archived) {
				filtered.push(repo);
			}
		}
		return filtered.sort(GithubProfile.#compareRepos);
	}

	async fetchRepos() {
		let repos = await this.#fetchReposPage(1);
		if (repos && repos.length === 100) {
			let page2 = await this.#fetchReposPage(2);
			repos = [ ...repos, ...page2 ];
		}
		return repos;
	}

	async #fetchReposPage(page = 1) {
		const url = `${API.url}/users/${this.username}/repos?sort=updated&per_page=100&page=${parseInt(page)}`;
		let json = [];
		try {
			let response = await fetch(url, {
				headers: {
					'Accept': API.mediaType,
					'Authentication': 'Bearer ' + this.token,
				},
			});
			if (response.ok) {
				json = await response.json();
			} else {
				console.error("Failed to fetch", response);
			}
		} catch (e) {
			console.error(e)
		}
		return json;
	}

	static #compareRepos(a, b) {
		if (b.stargazers_count > a.stargazers_count) {
			return 1;
		} else if (b.stargazers_count < a.stargazers_count) {
			return -1;
		}

		if (b.forks_count > a.forks_count) {
			return 1;
		} else if (b.forks_count < a.forks_count) {
			return -1;
		}

		if (b.watchers_count > a.watchers_count) {
			return 1
		} else if (b.watchers_count < a.watchers_count) {
			return -1;
		}

		if (b.updated_at > a.updated_at) {
			return 1;
		} else if (b.updated_at < a.updated_at) {
			return -1;
		}

		return 0;
	}


	async contributions() {
		let promises = []; // Generate concurrent requests
		const currentYear = new Date().getFullYear();
		for (let year = currentYear - 3; year <= currentYear; year++) {
			promises.push(this.#fetchYearContributions(year));
		}

		return (await Promise.all(promises))
			.reduce((acc, result) => {
				acc[result.year] = this.#processContributionsResult(result);
				return acc;
			}, {});
	}

	yearContributions(year) {
		return this.cache.get(STORAGE_KEYS.yearContributions(year), {
			fetch: this.fetchYearContributions.bind(this, year),
			isValid: contribs => contribs?.repositories?.length > 0,
		});
	}

	async fetchYearContributions(year) {
		if (isNaN(year)) {
			year = new Date().getFullYear();
		}
		let result = await this.#fetchYearContributions(year);
		return this.#processContributionsResult(result);
	}

	async #fetchYearContributions(year) {
		const startDate = new Date(year, 0);
		const endDate = new Date(year, 11, 31, 23, 59, 59);

		const result = await this.#queryGQL(`
			fragment repoInfo on Repository {
				name
				url
				description
				owner {
					avatarUrl
					login
				}
			}
			query($from: DateTime, $to: DateTime) {
				viewer {
					contributionsCollection(from: $from, to: $to) {
						hasAnyContributions
						earliestRestrictedContributionDate
						latestRestrictedContributionDate
						commitContributionsByRepository {
							contributions {
								totalCount
							}
							repository {
								...repoInfo
							}
						}
						issueContributionsByRepository {
							contributions {
								totalCount
							}
							repository {
								...repoInfo
							}
						}
						pullRequestContributionsByRepository {
							contributions {
								totalCount
							}
							repository {
								...repoInfo
							}
						}
					}
				}
			}
		`, { from: startDate, to: endDate });
		result.year = year;
		return result;
	}

	#processContributionsResult(result) {
		let repositories = {};
		let count = 0;

		const collection = result.viewer.contributionsCollection;
		for (const type of ['commit', 'issue', 'pullRequest']) {
			const contributionsByRepository = collection[type+'ContributionsByRepository'];
			for (const { repository, contributions } of contributionsByRepository) {
				if (repository.owner.login === this.username)
					continue; // Ignore own contributions
				const fullName = repository.owner.login + '/' + repository.name;
				repositories[fullName] = {
					fullName,
					name: repository.name,
					owner: repository.owner.login,
					avatarUrl: repository.owner.avatarUrl,
					url: repository.url,
					description: repository.description,
				};
				count += contributions.totalCount;
			}
		}

		return {
			count,
			repositories: Object.values(repositories),
			year: result.year,
		};
	}


	#queryGQL(query, options = {}) {
		return graphql(query, {
			headers: {
				authorization: 'Bearer ' + this.token,
			},
			...options,
		});
	}
}
