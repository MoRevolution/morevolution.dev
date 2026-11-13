/** @param {{ params: { slug: string } }} opts */
export async function load({ params }) {
	const posts = import.meta.glob(['/src/posts/**/*.md', '!**/README.md']);
	const match =
		posts[`/src/posts/${params.slug}.md`] ?? posts[`/src/posts/${params.slug}/index.md`];

	if (!match) {
		throw new Error(`Post not found: ${params.slug}`);
	}

	const post = /** @type {{ default: import('svelte').Component, metadata: Record<string, any> }} */ (await match());

	return {
		content: post.default,
		meta: post.metadata
	};
}
