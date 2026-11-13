export async function load() {
	const postFiles = import.meta.glob(['/src/posts/**/*.md', '!**/README.md']);
	const posts = [];

	for (const [path, resolver] of Object.entries(postFiles)) {
		const post = /** @type {any} */ (await resolver());
		const metadata = post.metadata;
		if (metadata?.published) {
			posts.push({ ...metadata, slug: slugFor(path) });
		}
	}

	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return { posts };
}

/** Posts are either `/src/posts/<slug>.md` or `/src/posts/<slug>/index.md`. */
function slugFor(path) {
	const parts = path.split('/');
	const file = parts.pop() ?? '';
	return file === 'index.md' ? parts.pop() : file.replace('.md', '');
}
