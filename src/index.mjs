import express from 'express';

import './envirnoment.mjs';

import { MemoryCacheManager } from './cache/MemoryCacheManager.mjs';
import { GithubProfile } from './profile/index.mjs';

const PORT = parseInt(process.env.PORT) || 3000;

const app = express();

// const profile = ProfileManager.get('germanfr', process.env.GH_ACCESS_TOKEN);
const profile = new GithubProfile(
	process.env.GH_USERNAME,
	process.env.GH_ACCESS_TOKEN,
	new MemoryCacheManager(),
);

app.get('/repos/all', async (req, res) => {
	res.json(await profile.repos());
});

app.get('/repos', async (req, res) => {
	res.json(await profile.ownRepos());
});

app.get('/contributions/:year(\\d{4})?', async (req, res) => {
	try {
		let contributions;
		if (req.params.year) {
			contributions = await profile.yearContributions(req.params.year);
		} else {
			contributions = await profile.contributions();
		}
		res.json(contributions);
	} catch (err) {
		res.status(err.status || 500);
		res.json({ error: err });
	}
});



app.listen(PORT, function(...args) {
	console.log(`Server running on port ${this.address().port}`);
});
