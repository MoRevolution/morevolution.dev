---
title: About
---

<svelte:head>
	<title>About — Motti</title>
</svelte:head>

<div class="about">

# About me

Hey! I'm Motti — I study CS and Statistics at [WashU](https://www.google.com/search?q=WashU). I like building things for people who build things and I've worked on data/ML infrastructure at Deere, Microsoft, and Northern Trust.

When I'm not staring at a screen, I climb, bike, and read ([Goodreads](https://www.goodreads.com/user/show/125001655-morevolution) — infrequently updated, but I'll try).

Wanna chat? [Email me](mailto:k.motti@wustl.edu) or [book time](https://calendly.com/morevolution).


</div>

<style>
	.about {
		max-width: 640px;
		line-height: 1.7;
	}

	.about :global(h1) {
		color: var(--heading);
		margin-bottom: 1rem;
	}

	.about :global(p) {
		font-size: 1.05rem;
		margin-bottom: 1rem;
	}

	.about :global(a) {
		color: var(--text);
		text-decoration: underline;
		text-decoration-color: var(--muted);
		text-underline-offset: 3px;
		transition: text-decoration-color 0.2s, color 0.2s;
	}

	.about :global(a:hover) {
		color: var(--link-hover);
		text-decoration-color: var(--link-hover);
	}
</style>
