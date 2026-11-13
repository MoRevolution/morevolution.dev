---
title: About
---

<svelte:head>
	<title>About — Motti</title>
</svelte:head>

<div class="about">

<div class="intro">
<div>

# About me

Hey! I'm Motti, a CS grad student @ [WashU](https://www.google.com/search?q=WashU) doing fun stuff with coding theory.

I build infra and dev tools, mostly because I love making people more excited about their work. I've been lucky to do so during my time at Deere, Xbox, and Northern Trust, alongside some awesome folks I now call friends.

Off-screen I climb, bike, and read ([Goodreads](https://www.goodreads.com/user/show/125001655-morevolution)).

</div>

<img class="me" src="/img/motti.webp" alt="Me holding up a pack of Minecraft playing cards, wearing a 'Hello my name is Motti' sticker" />
</div>

<details class="goodies">
	<summary>a few other things I like</summary>
	<ul>
		<li><strong>tools I'd fight for:</strong> <a href="https://astral.sh/">astral</a> (uv &amp; ty 🔥) · <a href="https://www.nushell.sh/">nushell</a> · <a href="https://github.com/ajeetdsouza/zoxide">zoxide</a> · <a href="https://github.com/junegunn/fzf">fzf</a> · <a href="https://www.raycast.com/">raycast</a> · <a href="https://qalculate.github.io/">Qalc</a></li>
		<li><strong>reads I loved:</strong> on <a href="https://morevolution.raindrop.page/stuff-i-ve-loved-68356925">Raindrop</a></li>
		<li><strong>dev setup:</strong> a <a href="https://github.com/MoRevolution/dev">nushell setup script</a> (RIP local envs 😔)</li>
		<li><strong>psst:</strong> the kid on the home page is Eric, from Dr. Seuss's <em>The King's Stilts</em>. He keeps a schedule.</li>
	</ul>
</details>

Love meeting new people! [Say hi](mailto:k.motti@wustl.edu) or [grab a spot on my cal](https://cal.com/morevolution).

</div>

<style>
	.about {
		max-width: 780px;
		width: 100%;
		line-height: 1.8;
	}

	.intro {
		display: grid;
		grid-template-columns: 1fr 210px;
		gap: 2.5rem;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	/* A print pinned to the page, on the same cream paper as Eric's sticker. */
	.me {
		width: 100%;
		padding: 7px;
		background: #f3ede0;
		border-radius: 4px;
		rotate: 2.5deg;
		box-shadow: 0 12px 30px rgb(0 0 0 / 0.45);
		transition: rotate 0.3s ease;
	}

	.me:hover {
		rotate: 0deg;
	}

	@media (max-width: 640px) {
		.intro {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.me {
			order: -1;
			width: 170px;
			justify-self: center;
		}
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

	/* A thin Cat-in-the-Hat stripe down the side. */
	.goodies {
		margin: 2rem 0;
		padding-left: 1.2rem;
		border-left: 3px solid;
		border-image: repeating-linear-gradient(rgb(200 53 43 / 0.7) 0 10px, rgb(243 237 224 / 0.5) 10px 20px) 3;
	}

	.goodies summary {
		cursor: pointer;
		list-style: none;
		color: var(--heading);
		font-style: italic;
	}

	.goodies summary::-webkit-details-marker {
		display: none;
	}

	.goodies summary::after {
		content: ' ▸';
		display: inline-block;
		font-style: normal;
		transition: rotate 0.2s;
	}

	.goodies[open] summary::after {
		rotate: 90deg;
	}

	.goodies ul {
		margin-top: 0.9rem;
		padding-left: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
