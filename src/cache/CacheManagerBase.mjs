const DEFAULT_MAX_AGE = 1000 * 60 * 60; // 1h

export class CacheManagerBase {
	constructor(maxAge) {
		this.maxAge = parseInt(maxAge) || DEFAULT_MAX_AGE;
	}

	async get(key, opts) {
		let data = undefined;
		const isValid = typeof opts.isValid === 'function'
			? opts.isValid
			: data => data != null;

		let savedData = this.getDataUnsafe(key);
		if (!this.hasData(key) || !isValid(savedData)) {
			try {
				data = await opts.fetch();
			} catch (e) {}

			if (isValid(data)) {
				this.saveData(key, data);
			}
		}

		if (data === undefined) { // Return cached data if nothing is received
			data = isValid(savedData) ? savedData : null;
		}

		return data;
	}

	hasData(key) {
		return !this.hasExpired(key) && this.getDataUnsafe(key) != null;
	}

	hasExpired(key) {
		let timestamp = this.getTimestamp(key);
		return !timestamp || timestamp < Date.now() - this.maxAge;
	}

	getData(key, ignoreExpiration = true) {
		if (!ignoreExpiration && this.hasExpired(key)) {
			// Entry exists but it's expired
			this.removeData(key);
			return null;
		}

		this.getDataUnsafe(key);
	}


	// Get data without checking if it has expired
	getDataUnsafe(key) {
		throw new Error("Abstract method not implemented!");
	}

	saveData(key, data) {
		throw new Error("Abstract method not implemented!");
	}

	removeData(key) {
		throw new Error("Abstract method not implemented!");
	}

	getTimestamp(key) {
		throw new Error("Abstract method not implemented!");
	}
}
