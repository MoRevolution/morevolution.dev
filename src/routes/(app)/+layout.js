export const prerender = true;

export async function load() {
	const postFiles = import.meta.glob(['/src/posts/**/*.md', '!**/README.md']);
	const posts = [];

	for (const [path, resolver] of Object.entries(postFiles)) {
		const post = /** @type {any} */ (await resolver());
		const metadata = post.metadata;
		if (metadata?.published) {
			const slug = path.endsWith('/index.md')
				? path.split('/').at(-2)
				: path.split('/').at(-1)?.replace('.md', '');
			posts.push({ title: metadata.title, date: metadata.date, slug });
		}
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return {
		hasNotes: posts.length > 0,
		latestNote: posts[0] ?? null
	};
}
