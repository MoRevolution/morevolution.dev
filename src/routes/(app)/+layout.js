export const prerender = true;

export async function load() {
	const postFiles = import.meta.glob('/src/posts/*.md');
	const posts = [];

	for (const [path, resolver] of Object.entries(postFiles)) {
		const post = /** @type {any} */ (await resolver());
		const metadata = post.metadata;
		if (metadata?.published) {
			posts.push(metadata);
		}
	}

	return {
		hasBlogPosts: posts.length > 0
	};
}
