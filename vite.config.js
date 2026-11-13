import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Posts may be symlinks into other repos. Vite resolves symlinks to their real paths, so those
// directories have to be allowed explicitly — and `fs.allow` replaces the default list rather
// than extending it, hence the workspace root below.
const postsDir = path.resolve('src/posts');
const linkedPostRoots = fs.existsSync(postsDir)
	? fs
			.readdirSync(postsDir, { withFileTypes: true })
			.filter((e) => e.isSymbolicLink())
			.map((e) => fs.realpathSync(path.join(postsDir, e.name)))
	: [];

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		fs: { allow: [searchForWorkspaceRoot(process.cwd()), ...linkedPostRoots] }
	}
});
