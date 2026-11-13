# Posts

`<slug>.md`, or `<slug>/index.md` if the post needs its own components next to it.

Symlinks are fine here — write-ups can live in the repo that produced them:

```sh
ln -s /path/to/experiments/006-pq-access/blog/access-redundancy-pq src/posts/access-redundancy-pq
```

`vite.config.js` collects symlinks in this folder at startup and allows their real paths, so
restart the dev server after adding one.

Frontmatter: `title`, `date`, `published`, and an optional `description`.

FYI on math: `$x$` and `$$x$$` work, but **not inside raw HTML or component props** — remark
doesn't look there, so it leaks through as literal text and any `{}` breaks the Svelte parse.
Write those bits in plain text. The plugin versions are pinned on purpose: mdsvex bundles
remark 8, so `remark-math` has to stay on v3.
