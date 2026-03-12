/** @param {{ params: { slug: string } }} opts */
export async function load({ params }) {
	const posts = import.meta.glob('/src/posts/*.md');
	const match = posts[`/src/posts/${params.slug}.md`];

	if (!match) {
		throw new Error(`Post not found: ${params.slug}`);
	}

	const post = /** @type {{ default: import('svelte').Component, metadata: Record<string, any> }} */ (await match());

	return {
		content: post.default,
		meta: post.metadata
	};
}
