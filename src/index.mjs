import './envirnoment.mjs';

import express from 'express';
import cors from 'cors';


import { MemoryCacheManager } from './cache/MemoryCacheManager.mjs';
import { GithubProfile } from './profile/index.mjs';

const PORT = parseInt(process.env.PORT) || 3000;

const app = express();
if (process.env.CLIENT_DOMAIN) {
	app.use(cors({ origin: process.env.CLIENT_DOMAIN }));
}

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
	console.log(`NODE_ENV=${process.env.NODE_ENV}`)
	console.log(`Server running on port ${this.address().port}`);
});
