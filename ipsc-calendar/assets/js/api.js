/**
 * REST client with an in-memory cache of in-flight and finished requests.
 */

/** Appends a path to the REST base, supporting both pretty and "?rest_route=" URLs. */
export function buildRestUrl(base, path, params = {}) {
	const url = new URL(base, window.location.href);
	if (url.searchParams.has('rest_route')) {
		url.searchParams.set('rest_route', url.searchParams.get('rest_route').replace(/\/?$/, '/') + path);
	} else {
		url.pathname = url.pathname.replace(/\/?$/, '/') + path;
	}
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	return url.toString();
}

export function createApi(restUrl) {
	const cache = new Map();

	return {
		/**
		 * @param {string} from Y-m-d
		 * @param {string} to   Y-m-d
		 */
		getEvents(from, to) {
			const key = `${from}|${to}`;
			if (!cache.has(key)) {
				const request = fetch(buildRestUrl(restUrl, 'events', { from, to }), {
					headers: { Accept: 'application/json' },
					credentials: 'same-origin',
				})
					.then((response) => {
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						return response.json();
					})
					.catch((error) => {
						cache.delete(key);
						throw error;
					});
				cache.set(key, request);
			}
			return cache.get(key);
		},
	};
}
