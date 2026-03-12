export async function load() {
	const postFiles = import.meta.glob('/src/posts/*.md');
	const posts = [];

	for (const [path, resolver] of Object.entries(postFiles)) {
		const post = /** @type {any} */ (await resolver());
		const metadata = post.metadata;
		if (metadata?.published) {
			const slug = path.split('/').pop()?.replace('.md', '');
			posts.push({ ...metadata, slug });
		}
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return { posts };
}
