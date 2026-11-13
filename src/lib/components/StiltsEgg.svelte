<script>
	import { flushSync } from 'svelte';
	import { LINES, pickLine } from '$lib/stilts-lines.js';

	/** @type {{ pic: HTMLImageElement | null }} */
	let { pic } = $props();

	// Points on Eric.png, in its 256px image space.
	const IMG = 256;
	const WAIST = [128, 160]; // sway pivot for the whole sticker
	const NECK = [138, 100]; // head-shake pivot
	const CUT = 98; // head/body split, just under the ruff
	const HAT = [142, 39]; // top of his hat, where a visiting Nizzard stands
	const SHOES = [
		[84, 214],
		[156, 212]
	]; // stilt attach points under each sole

	const PAPER = '#f3ede0';
	const STEP = 0.32;
	const STRIDE = 60;
	const DROON_ODDS = 0.1;
	const HIDE_AFTER = 6; // clicks in one visit before Eric goes off to hide
	const NIZZARD_ODDS = { walk: 0.5, shake: 0.25 };
	const NIZZARD_IMGS = ['/img/nizzard-perched.png', '/img/nizzard-flying.png'];
	const WALKED_KEY = 'stilts-walked';
	const STOLEN_KEY = 'stilts-stolen';
	// droon-step.webp is the same drawing as droon.webp with the front foot up mid-step.
	const DROON_IMGS = ['/img/droon.webp', '/img/droon-step.webp'];
	// Display height, and his reaching fingers and soles as fractions of the image.
	const DROON = { h: 165, aspect: 322 / 330, hand: [0.1, 0.485], feet: [0.6, 0.97] };
	// Layers: the drawing, the mid-step drawing (shown during front-foot steps), and the back shoe,
	// clipped out of both so it can tiptoe on its own, pivoting at the ankle.
	const BACK_SHOE = 'polygon(80% 88.2%, 100% 88.2%, 100% 100%, 80% 100%)';
	const WITHOUT_BACK_SHOE = 'polygon(0 0, 100% 0, 100% 88.2%, 80% 88.2%, 80% 100%, 0 100%)';
	const DROON_PARTS = [
		{ src: DROON_IMGS[0], clip: WITHOUT_BACK_SHOE },
		{ src: DROON_IMGS[1], clip: WITHOUT_BACK_SHOE, hidden: true },
		{ src: DROON_IMGS[0], clip: BACK_SHOE, pivot: '91% 88.5%' }
	];

	/** @param {number} v */
	const pct = (v) => `${(v / IMG) * 100}%`;
	const today = () => new Date().toLocaleDateString('en-CA');

	let running = $state(false);
	let line = $state('');
	let doc = $state({ w: 0, h: 0 });
	let at = $state({ x: 0, y: 0, size: 140 });
	let bubbleAt = $state({ x: 0, y: 0, tail: 0 });

	// Bound once the overlay mounts; play() only touches them after that.
	/** @type {HTMLDivElement} */ let sticker = $state(/** @type {any} */ (null));
	/** @type {HTMLImageElement} */ let head = $state(/** @type {any} */ (null));
	/** @type {HTMLParagraphElement} */ let bubble = $state(/** @type {any} */ (null));
	/** @type {SVGFilterElement} */ let ink = $state(/** @type {any} */ (null));
	/** @type {SVGFETurbulenceElement} */ let turb = $state(/** @type {any} */ (null));
	/** @type {HTMLDivElement} */ let villain = $state(/** @type {any} */ (null));
	/** @type {HTMLImageElement[]} */ const droonParts = $state([]);
	/** @type {HTMLDivElement} */ let bird = $state(/** @type {any} */ (null));
	/** @type {HTMLElement[]} */ const shoes = $state([]);
	/** @type {SVGGElement[]} */ const poles = $state([]);

	let busy = false;
	let calm = false; // reduced motion: no sticker, the bubble just fades in and out
	let pokes = 0;
	let bubbleW = 0;
	/** @type {typeof import('gsap').gsap | undefined} */ let lib;
	/** @type {gsap.core.Timeline | null} */ let peeking = null; // runs while Eric is out hiding
	let nudges = 0;

	/** @param {HTMLElement} node */
	function portal(node) {
		document.body.append(node);
		return { destroy: () => node.remove() };
	}

	/** @param {string} key */
	function stampedToday(key) {
		try {
			return localStorage.getItem(key) === today();
		} catch {
			return false;
		}
	}

	/** @param {string} key */
	function stampToday(key) {
		try {
			localStorage.setItem(key, today());
		} catch {}
	}

	// Test switches: ?five forces the walk, ?droon forces Droon's ending, ?nizzard puts the bird in
	// whichever sequence plays, ?hide sends Eric off to hide, ?visit sends a Nizzard by right away,
	// ?hi does nothing but show the greeting wave.
	// Any of them also overrides reduced motion, so the egg can be checked on a machine that has it on.
	const SWITCHES = ['five', 'droon', 'nizzard', 'hide', 'visit', 'hi'];

	/** @param {URLSearchParams} params */
	function reducedMotion(params) {
		if (SWITCHES.some((s) => params.has(s))) return false;
		return matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/** The 👋 in the heading waves hello once the page has loaded. */
	function greet() {
		const h1 = pic?.closest('.home')?.querySelector('h1');
		if (busy || !h1 || h1.children.length || !h1.textContent?.includes('👋')) return;
		const html = h1.innerHTML;
		h1.innerHTML = html.replace('👋', '<span style="display:inline-block;transform-origin:70% 80%">👋</span>');
		const hand = /** @type {HTMLElement} */ (h1.lastElementChild);
		const swing = [0, 16, -8, 16, -6, 12, 0].map((deg) => ({ rotate: `${deg}deg` }));
		hand
			.animate(swing, { duration: 1500, easing: 'ease-in-out' })
			.finished.finally(() => (h1.innerHTML = html));
	}

	// A Nizzard drops by a couple of times per visit.
	$effect(() => {
		const params = new URLSearchParams(location.search);
		if (reducedMotion(params)) return;
		const hello = setTimeout(greet, 700);
		const soon = params.has('visit');
		const first = soon ? 1500 : 6000 + Math.random() * 4000;
		const timers = [
			setTimeout(visit, first),
			setTimeout(visit, first + 40000 + Math.random() * 30000)
		];
		return () => {
			clearTimeout(hello);
			timers.forEach(clearTimeout);
			peeking?.kill();
			removeEventListener('resize', settle);
		};
	});

	export async function play() {
		if (busy || !pic) return;
		busy = true;
		try {
			if (peeking) await nudge();
			else await run(pic);
		} finally {
			busy = false;
		}
	}

	/** @param {HTMLImageElement} pic */
	async function run(pic) {
		const h1 = pic.closest('.home')?.querySelector('h1');
		const hour = new Date().getHours();
		const walked = stampedToday(WALKED_KEY);
		const params = new URLSearchParams(location.search);
		const forced = params.has('five') || params.has('droon');
		calm = reducedMotion(params);
		const plain = !!h1 && !h1.children.length;
		const walk = !calm && plain && (forced || (hour === 17 && !walked));
		if (!walk) pokes += 1;
		const hideNow = !calm && !walk && (params.has('hide') || pokes >= HIDE_AFTER);
		const droon = params.has('droon') || (walk && !forced && Math.random() < DROON_ODDS);
		const nizzard =
			!calm &&
			!hideNow &&
			plain &&
			(params.has('nizzard') ||
				(!forced && Math.random() < NIZZARD_ODDS[walk ? 'walk' : 'shake']));

		// Load before mounting, so nothing shows until the timeline can take over.
		const [{ gsap }] = await Promise.all([
			import('gsap'),
			...[...(nizzard ? NIZZARD_IMGS : []), ...(droon ? DROON_IMGS : [])].map(preload)
		]);
		lib = gsap;
		measure(pic);
		const heading = h1 && (walk || nizzard) ? splitHeading(h1) : null;
		running = true;
		flushSync();

		let stayOut = false;
		try {
			if (walk && heading) {
				pic.style.opacity = '0.12';
				stampToday(WALKED_KEY);
				if (droon) stampToday(STOLEN_KEY);
				await walkTimeline(gsap, heading, droon, nizzard);
			} else if (hideNow) {
				pic.style.opacity = '0.12';
				await hide(gsap);
				stayOut = true;
			} else {
				const m = heading?.chars.find((el) => el.textContent === 'M');
				const perch = heading && m ? heading.stone(m) : undefined;
				const text = pickLine(perch ? LINES.nizzard : excuses(hour, walked));
				const tl = gsap.timeline();
				if (calm) {
					gsap.set(sticker, { autoAlpha: 0 });
					speak(tl, text, 0, 2);
				} else {
					pic.style.opacity = '0.12';
					shake(tl, text, perch);
				}
				await tl;
			}
		} finally {
			heading?.restore();
			if (!stayOut) settle();
		}
	}

	/** @param {HTMLImageElement} pic */
	function measure(pic) {
		const r = pic.getBoundingClientRect();
		at = { x: r.left + scrollX, y: r.top + scrollY, size: r.width };
		doc = {
			w: document.documentElement.clientWidth,
			h: document.documentElement.scrollHeight
		};
	}

	/** Unmount the overlay and put the real picture back. Also the resize handler while Eric hides. */
	function settle() {
		peeking?.kill();
		peeking = null;
		removeEventListener('resize', settle);
		if (pic) pic.style.opacity = '';
		running = false;
		line = '';
	}

	/**
	 * Places to hide at the edges of what's on screen, as sticker transforms from home. The
	 * overlay clips at the page's edges, so only the peeking part shows.
	 */
	function hidingSpots() {
		const s = at.size;
		const homeX = at.x + s / 2;
		const homeY = at.y + (s * WAIST[1]) / IMG;
		const mid = scrollY + innerHeight * 0.55;
		/** @param {number} x @param {number} y @param {number} rotation @param {number} scaleX @param {number} dx @param {number} dy */
		const spot = (x, y, rotation, scaleX, dx, dy) => {
			const hidden = { x: x - homeX, y: y - homeY, rotation };
			return { hidden, scaleX, peek: { x: hidden.x + dx * s, y: hidden.y + dy * s } };
		};
		const spots = [
			spot(doc.w + s * 0.3, mid, -22, -1, -0.32, 0),
			spot(-s * 0.3, mid, 22, 1, 0.32, 0)
		];
		// The bottom and top edges only hide him when that edge of the page is on screen.
		const side = () => doc.w * (Math.random() < 0.5 ? 0.12 + Math.random() * 0.2 : 0.68 + Math.random() * 0.2);
		if (doc.h <= scrollY + innerHeight + 1) spots.push(spot(side(), doc.h + s * 0.44, 0, 1, 0, -0.26));
		if (scrollY === 0) spots.push(spot(side(), -s * 0.44, 180, 1, 0, 0.26));
		return spots;
	}

	/** Peel off, scurry to a hiding spot, and keep peeking out until found. @param {typeof import('gsap').gsap} gsap */
	async function hide(gsap) {
		const spots = hidingSpots();
		const { hidden, scaleX, peek } = spots[Math.floor(Math.random() * spots.length)];
		const tl = gsap.timeline();
		lift(tl);
		speak(tl, pickLine(LINES.hide), 0.35, 1.1);
		tl.to(sticker, { x: hidden.x, duration: 0.9, ease: 'power1.inOut' }, 1.6);
		tl.to(
			sticker,
			{
				keyframes: [
					{ y: Math.min(hidden.y, 0) - 60, duration: 0.4, ease: 'power2.out' },
					{ y: hidden.y, duration: 0.5, ease: 'power2.in' }
				]
			},
			1.6
		);
		tl.to(sticker, { rotation: hidden.rotation, scaleX, scaleY: 1, rotationX: 0, duration: 0.9 }, 1.6);
		await tl;
		sticker.style.pointerEvents = 'auto';
		addEventListener('resize', settle);
		nudges = 0;
		peeking = gsap
			.timeline({ repeat: -1, repeatDelay: 2, delay: 1 })
			.to(sticker, { ...peek, duration: 0.3, ease: 'power2.out' })
			.to(sticker, { ...hidden, duration: 0.3, ease: 'power2.in' }, '+=0.8');
	}

	/** Clicked in his hiding spot, or called home: hop back and press flat. @param {boolean} [gaveUp] */
	async function found(gaveUp = false) {
		if (!peeking || !lib) return;
		const gsap = lib;
		peeking.kill();
		peeking = null;
		removeEventListener('resize', settle);
		sticker.style.pointerEvents = '';
		const y = Number(gsap.getProperty(sticker, 'y'));
		const tl = gsap.timeline();
		tl.to(sticker, { x: 0, rotation: 0, scaleX: 1, duration: 0.8, ease: 'power1.inOut' }, 0);
		tl.to(
			sticker,
			{
				keyframes: [
					{ y: Math.min(y, -6) - 60, duration: 0.35, ease: 'power2.out' },
					{ y: -6, duration: 0.45, ease: 'power2.in' }
				]
			},
			0
		);
		speak(tl, pickLine(gaveUp ? LINES.gaveUp : LINES.found), 0.85, 1.4);
		press(tl);
		await tl;
		pokes = 0;
		settle();
	}

	async function onFound() {
		if (busy) return;
		busy = true;
		try {
			await found();
		} finally {
			busy = false;
		}
	}

	/** His empty spot was clicked: peek out now as a hint, and come home on the second click. */
	async function nudge() {
		nudges += 1;
		if (nudges >= 2) await found(true);
		else peeking?.restart();
	}

	/** A Nizzard drops by on its own, lands on a letter or on Eric's hat, pecks, looks around, leaves. */
	async function visit() {
		const h1 = pic?.closest('.home')?.querySelector('h1');
		if (busy || peeking || !pic || !h1 || h1.children.length) return;
		if (document.visibilityState !== 'visible') return;
		const real = pic;
		busy = true;
		try {
			const [{ gsap }] = await Promise.all([import('gsap'), ...NIZZARD_IMGS.map(preload)]);
			lib = gsap;
			measure(real);
			const heading = splitHeading(h1);
			running = true;
			flushSync();
			try {
				gsap.set(sticker, { autoAlpha: 0 });
				const letters = heading.chars.filter((el) => /\p{L}/u.test(el.textContent ?? ''));
				const k = at.size / IMG;
				/** @type {Stone} */
				const perch =
					Math.random() < 0.4
						? { el: real, x: at.x + HAT[0] * k, top: at.y + HAT[1] * k }
						: heading.stone(letters[Math.floor(Math.random() * letters.length)]);
				const tl = gsap.timeline();
				nizzardIn(tl, perch, 0);
				peck(tl, perch, 1.1);
				tl.set(bird, { scaleX: -1 }, 1.7);
				tl.set(bird, { scaleX: 1 }, 2.2);
				peck(tl, perch, 2.5);
				nizzardOut(tl, 3.1);
				await tl;
			} finally {
				heading.restore();
				gsap.set(real, { clearProps: 'transform' });
				settle();
			}
		} finally {
			busy = false;
		}
	}

	/** @param {string} src */
	function preload(src) {
		const img = new Image();
		img.src = src;
		return img.decode().catch(() => {});
	}

	/** @param {number} hour @param {boolean} walked */
	function excuses(hour, walked) {
		if (stampedToday(STOLEN_KEY)) return LINES.stolen;
		if (pokes > 3) return LINES.pester;
		if (walked) return LINES.walked;
		if (hour < 17) return LINES.early;
		return hour === 17 ? LINES.now : LINES.late;
	}

	/**
	 * The bubble's tail points at the brim of Eric's hat, offset by the sticker's (dx, dy);
	 * the bubble itself is clamped to the viewport.
	 */
	function placeBubble(dx = 0, dy = 0) {
		const tipX = at.x + at.size * 0.72 + dx;
		const left = Math.min(Math.max(tipX - 18, 8), doc.w - bubbleW - 8);
		bubbleAt = { x: left, y: at.y + at.size * 0.12 + dy, tail: tipX - left };
	}

	/**
	 * Pop `text` in the bubble at time `t` and take it away `hold` seconds later.
	 * @param {gsap.core.Timeline} tl @param {string} text @param {number} t @param {number} hold
	 */
	function speak(tl, text, t, hold) {
		tl.call(
			() => {
				line = text;
				flushSync();
				bubbleW = bubble.offsetWidth;
				placeBubble();
			},
			undefined,
			t
		);
		tl.fromTo(
			bubble,
			{ scale: calm ? 1 : 0, autoAlpha: 0, y: 0 },
			calm
				? { autoAlpha: 1, duration: 0.2 }
				: { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.5)' },
			t
		);
		tl.to(bubble, { autoAlpha: 0, y: -4, duration: 0.25 }, t + hold);
	}

	/** Sink `target` 4px below `base` and spring back, like a soft floorboard. @param {gsap.core.Timeline} tl @param {object} target @param {number} base @param {number} t */
	function dip(tl, target, base, t) {
		tl.to(
			target,
			{
				keyframes: [
					{ y: base + 4, duration: 0.07, ease: 'power2.out' },
					{ y: base, duration: 0.45, ease: 'elastic.out(1, 0.4)' }
				]
			},
			t
		);
	}

	/** @param {gsap.core.Timeline} tl */
	function lift(tl) {
		tl.set(sticker, { transformOrigin: `${pct(WAIST[0])} ${pct(WAIST[1])}`, transformPerspective: 500 });
		tl.to(sticker, {
			y: -6,
			scale: 1.08,
			rotation: -3,
			rotationX: 14,
			'--paper': 1,
			'--lift': 1,
			duration: 0.45,
			ease: 'back.out(2)'
		});
	}

	/** Press the sticker back flat, exactly where the real image sits. @param {gsap.core.Timeline} tl */
	function press(tl) {
		tl.to(sticker, { x: 0, y: 0, scale: 1, rotation: 0, rotationX: 0, duration: 0.3, ease: 'power2.in' });
		tl.addLabel('down');
		tl.set(sticker, { transformOrigin: '50% 85%' }, 'down');
		tl.to(sticker, { scaleX: 1.04, scaleY: 0.94, duration: 0.07, ease: 'power1.out' }, 'down');
		tl.to(sticker, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
		tl.to(sticker, { '--paper': 0, '--lift': 0, duration: 0.3 }, 'down');
	}

	/** @param {gsap.core.Timeline} tl @param {number} t */
	function headShake(tl, t) {
		tl.to(
			head,
			{
				keyframes: { rotation: [0, -10, 8, -6, 3, 0], x: [0, -3, 3, -2, 1, 0], easeEach: 'sine.inOut' },
				duration: 0.9
			},
			t
		);
	}

	/** @param {gsap.core.Timeline} tl @param {string} text @param {Stone} [perch] */
	function shake(tl, text, perch) {
		lift(tl);
		if (perch) {
			nizzardIn(tl, perch, 0.15);
			peck(tl, perch, 1.1);
			peck(tl, perch, 1.45);
			headShake(tl, 1);
			speak(tl, text, 1, 1.5);
			nizzardOut(tl, 2);
		} else {
			headShake(tl, 0.35);
			speak(tl, text, 0.35, 1.75);
		}
		press(tl);
	}

	/** Flap the flying Nizzard's wings for `d` seconds from `t`. @param {gsap.core.Timeline} tl @param {number} t @param {number} d */
	function flap(tl, t, d) {
		const n = Math.max(1, Math.round(d / 0.18));
		tl.to(
			bird.children[1],
			{ scaleY: 0.72, transformOrigin: '50% 40%', duration: d / (2 * n), ease: 'sine.inOut', yoyo: true, repeat: 2 * n - 1 },
			t
		);
	}

	/** A Nizzard swoops in from the top right and lands on `perch` at t + 0.8. @param {gsap.core.Timeline} tl @param {Stone} perch @param {number} t */
	function nizzardIn(tl, perch, t) {
		const [perched, flying] = bird.children;
		tl.set(bird, { autoAlpha: 1, x: doc.w + 60, y: perch.top - 200, scaleX: 1, rotation: 0 }, t);
		tl.set(flying, { autoAlpha: 1 }, t);
		tl.set(perched, { autoAlpha: 0 }, t);
		tl.to(bird, { x: perch.x, duration: 0.8, ease: 'power2.out' }, t);
		tl.to(bird, { y: perch.top, duration: 0.8, ease: 'power2.in' }, t);
		flap(tl, t, 0.8);
		tl.set(flying, { autoAlpha: 0 }, t + 0.8);
		tl.set(perched, { autoAlpha: 1 }, t + 0.8);
		dip(tl, perch.el, 0, t + 0.8);
		dip(tl, bird, perch.top, t + 0.8);
	}

	/** Lean in, take a bite of the letter underfoot, straighten up. @param {gsap.core.Timeline} tl @param {Stone} perch @param {number} t */
	function peck(tl, perch, t) {
		tl.to(bird, { keyframes: { rotation: [0, -26, 0], easeEach: 'power2.inOut' }, duration: 0.3 }, t);
		dip(tl, perch.el, 0, t + 0.15);
		dip(tl, bird, perch.top, t + 0.15);
	}

	/** Startle, turn, and flap away up and to the right. @param {gsap.core.Timeline} tl @param {number} t */
	function nizzardOut(tl, t) {
		const [perched, flying] = bird.children;
		tl.to(bird, { y: '-=12', rotation: 0, duration: 0.1, ease: 'power2.out' }, t);
		tl.set(perched, { autoAlpha: 0 }, t + 0.1);
		tl.set(flying, { autoAlpha: 1 }, t + 0.1);
		tl.set(bird, { scaleX: -1 }, t + 0.1);
		tl.to(bird, { x: '+=280', duration: 0.8, ease: 'power1.in' }, t + 0.1);
		tl.to(bird, { y: '-=260', duration: 0.8, ease: 'power2.in' }, t + 0.1);
		flap(tl, t + 0.1, 0.8);
		tl.set(bird, { autoAlpha: 0 }, t + 0.9);
	}

	/**
	 * Wrap each character of the heading in an inline-block span so letters can dip under the stilts.
	 * Words stay unbreakable so line wrapping is unchanged.
	 * @param {HTMLElement} h1
	 */
	function splitHeading(h1) {
		const html = h1.innerHTML;
		/** @type {HTMLSpanElement[]} */
		const chars = [];
		const parts = (h1.textContent ?? '')
			.split(/(\s+)/)
			.filter(Boolean)
			.map((part) => {
				if (/^\s/.test(part)) return part;
				const word = document.createElement('span');
				word.style.whiteSpace = 'nowrap';
				for (const ch of part) {
					const span = document.createElement('span');
					span.style.display = 'inline-block';
					span.textContent = ch;
					word.append(span);
					chars.push(span);
				}
				return word;
			});
		h1.replaceChildren(...parts);

		const style = getComputedStyle(h1);
		const ctx = /** @type {CanvasRenderingContext2D} */ (
			document.createElement('canvas').getContext('2d')
		);
		ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		const { fontBoundingBoxAscent: asc, fontBoundingBoxDescent: desc } = ctx.measureText('H');
		/**
		 * Page position of a character, with y at its glyph's top edge (less 3px for a stilt's
		 * rounded cap), so a stilt lands on an "e" lower than on an "h".
		 * @param {HTMLElement} el
		 * @returns {Stone}
		 */
		const stone = (el) => {
			const r = el.getBoundingClientRect();
			const baseline = r.top + (r.height - asc - desc) / 2 + asc;
			const top = baseline - ctx.measureText(el.textContent ?? '').actualBoundingBoxAscent - 3;
			return { el, x: r.left + r.width / 2 + scrollX, top: top + scrollY };
		};
		return { chars, stone, restore: () => (h1.innerHTML = html) };
	}

	/**
	 * @typedef {{ el: HTMLElement, x: number, top: number }} Stone
	 * @param {typeof import('gsap').gsap} gsap
	 * @param {ReturnType<typeof splitHeading>} heading
	 * @param {boolean} droon
	 * @param {boolean} nizzard
	 */
	function walkTimeline(gsap, heading, droon, nizzard) {
		const firstTop = heading.chars[0].getBoundingClientRect().top;
		const stones = heading.chars
			.filter(
				(el) =>
					Math.abs(el.getBoundingClientRect().top - firstTop) <= 2 &&
					/\p{L}/u.test(el.textContent ?? '')
			)
			.map(heading.stone);
		const wave = heading.chars.find((el) => el.textContent === '👋');

		const k = at.size / IMG;
		const originX = at.x + WAIST[0] * k;
		const originY = at.y + WAIST[1] * k;
		// Shoe x offsets from the waist, [world-left, world-right], for each facing.
		const facingRight = SHOES.map(([x]) => (x - WAIST[0]) * k);
		const facingLeft = facingRight.map((v) => -v).reverse();
		const shoeY = SHOES.map(([, y]) => originY + (y - WAIST[1]) * k);
		const length = at.size * 0.85;

		/** @param {number} x @param {Stone} [not] */
		const nearest = (x, not) =>
			stones.reduce((best, s) =>
				s !== not && (best === not || Math.abs(s.x - x) < Math.abs(best.x - x)) ? s : best
			);
		/** Body x that centres the shoes over the two tips. @param {Stone[]} on @param {number[]} offs */
		const bodyX = (on, offs) => (on[0].x + on[1].x - offs[0] - offs[1]) / 2 - originX;

		// Animated state that render() draws each frame: stilt tips, and stilt tops once they
		// come loose from the shoes.
		const tips = SHOES.map((_, i) => ({ x: originX + facingRight[i], y: shoeY[i] }));
		const tops = SHOES.map(() => ({ x: 0, y: 0 }));
		const rig = { on: 0, loose: 0 };
		let boiled = 0;
		let seed = 1;

		function render() {
			const ends = rig.loose
				? tops
				: shoes
						.map((el) => {
							const r = el.getBoundingClientRect();
							return { x: r.left + scrollX, y: r.top + scrollY };
						})
						.sort((a, b) => a.x - b.x);
			/** @type {number[]} */ const xs = [];
			/** @type {number[]} */ const ys = [];
			poles.forEach((g, i) => {
				const s = ends[i];
				const t = tips[i];
				const len = Math.hypot(t.x - s.x, t.y - s.y);
				const show = rig.on && len > 3;
				g.style.display = show ? '' : 'none';
				if (!show) return;
				const ux = (t.x - s.x) / len;
				const uy = (t.y - s.y) / len;
				const [pole, paint, peg] = /** @type {SVGLineElement[]} */ ([...g.children]);
				setLine(pole, s.x - ux * 8, s.y - uy * 8, t.x, t.y);
				setLine(paint, s.x - ux * 6, s.y - uy * 6, t.x - ux * 7, t.y - uy * 7);
				setLine(peg, s.x - uy * 7, s.y + ux * 7, s.x + uy * 7, s.y - ux * 7);
				xs.push(s.x, t.x);
				ys.push(s.y, t.y);
			});
			if (xs.length) {
				// Keep the filter region tight: feTurbulence fills all of it every frame.
				const m = 30;
				ink.setAttribute('x', String(Math.min(...xs) - m));
				ink.setAttribute('y', String(Math.min(...ys) - m));
				ink.setAttribute('width', String(Math.max(...xs) - Math.min(...xs) + 2 * m));
				ink.setAttribute('height', String(Math.max(...ys) - Math.min(...ys) + 2 * m));
			}
			if (tl.time() - boiled > 0.12 || tl.time() < boiled) {
				boiled = tl.time();
				turb.setAttribute('seed', String((seed = (seed % 6) + 1)));
			}
			placeBubble(Number(gsap.getProperty(sticker, 'x')), Number(gsap.getProperty(sticker, 'y')));
		}

		const tl = gsap.timeline({ onUpdate: render });

		/** @param {Stone} stone @param {number} i @param {number} t */
		const squish = (stone, i, t) => {
			dip(tl, stone.el, 0, t);
			dip(tl, tips[i], stone.top, t);
		};

		// Raise the sticker, then drop the poles from the shoes onto the nearest letters.
		lift(tl);
		tl.to(sticker, { scale: 1, rotation: 0, rotationX: 0, duration: 0.25, ease: 'power2.out' });
		const start = [nearest(tips[0].x)];
		start.push(nearest(tips[1].x, start[0]));
		const cur = [...start];
		const bodyY = (start[0].top + start[1].top) / 2 - length - (shoeY[0] + shoeY[1]) / 2;
		const t0 = tl.duration();
		tl.set(tips, { y: (i) => shoeY[i] - 6 }, t0);
		tl.set(rig, { on: 1 }, t0);
		// start, not cur: function values are read when the tween first plays, after cur has moved on.
		tl.to(tips, { x: (i) => start[i].x, y: (i) => start[i].top, duration: 0.35, ease: 'power2.in' }, t0);
		squish(cur[0], 0, t0 + 0.35);
		squish(cur[1], 1, t0 + 0.35);
		tl.to(
			sticker,
			{ x: bodyX(cur, facingRight), y: bodyY, duration: 0.6, ease: 'back.out(1.6)' },
			t0 + 0.4
		);
		speak(tl, pickLine(LINES.go), t0 + 0.4, 1.5);
		// Walk time cursor. Not tl.duration(): the letter wobbles run past each landing.
		let cue = t0 + 1;

		// A Nizzard pecking the M in Motti, until a stilt comes down next to it.
		const perch = nizzard ? stones.find((s) => s.el.textContent === 'M' && !start.includes(s)) : undefined;
		let perched = !!perch;
		if (perch) {
			nizzardIn(tl, perch, 0);
			peck(tl, perch, 1);
			peck(tl, perch, 1.35);
		}

		/** @param {number} i @param {Stone} to @param {number[]} offs */
		const step = (i, to, offs) => {
			const t = cue;
			cue += STEP;
			if (perched && perch && Math.abs(to.x - perch.x) < 40) {
				nizzardOut(tl, t);
				perched = false;
			}
			const from = cur[i];
			cur[i] = to;
			tl.to(tips[i], { x: to.x, duration: STEP, ease: 'power1.inOut' }, t);
			tl.to(
				tips[i],
				{ keyframes: { y: [from.top, Math.min(from.top, to.top) - 16, to.top] }, duration: STEP },
				t
			);
			tl.to(sticker, { x: bodyX(cur, offs), duration: STEP, ease: 'power1.inOut' }, t);
			tl.to(
				sticker,
				{
					keyframes: { y: [bodyY, bodyY - 5, bodyY], rotation: [0, i ? -3 : 3, 0] },
					duration: STEP
				},
				t
			);
			squish(to, i, t + STEP);
		};

		/** Shuffle so the `lead` tip ends on target[lead], the other foot following. @param {Stone[]} target @param {number} lead @param {number[]} offs */
		const walkTo = (target, lead, offs) => {
			const follow = 1 - lead;
			const span = target[lead].x - cur[lead].x;
			const gap = target[1].x - target[0].x;
			const from = cur[lead].x;
			const pairs = Math.max(1, Math.round(Math.abs(span) / STRIDE));
			for (let p = 1; p <= pairs; p++) {
				const next = p === pairs ? target[lead] : nearest(from + (span * p) / pairs);
				step(lead, next, offs);
				const ideal = lead ? next.x - gap : next.x + gap;
				step(follow, p === pairs ? target[follow] : nearest(ideal, next), offs);
			}
		};

		/** Hop in place while flipping to face the other way. @param {number} scaleX @param {number[]} offs */
		const turn = (scaleX, offs) => {
			const t = cue;
			cue += 0.34;
			const centre = (cur[0].x + cur[1].x) / 2 - (offs[0] + offs[1]) / 2;
			const next = [nearest(centre + offs[0])];
			next.push(nearest(centre + offs[1], next[0]));
			tl.to(sticker, { scaleX, duration: 0.3, ease: 'power2.inOut' }, t);
			tl.to(sticker, { keyframes: { y: [bodyY, bodyY - 16, bodyY] }, duration: 0.34 }, t);
			next.forEach((stone, i) => {
				tl.to(tips[i], { x: stone.x, duration: 0.34, ease: 'power1.inOut' }, t);
				tl.to(tips[i], { keyframes: { y: [cur[i].top, cur[i].top - 16, stone.top] }, duration: 0.34 }, t);
				squish(stone, i, t + 0.34);
				cur[i] = stone;
			});
			tl.to(sticker, { x: bodyX(cur, offs), duration: 0.34, ease: 'power1.inOut' }, t);
		};

		/** Lord Droon tiptoes in from behind, grabs both stilts and scuttles off with them; Eric tumbles home. */
		const snatch = () => {
			const t = cue + 0.15;
			const bx = bodyX(cur, facingLeft);
			const loose = facingLeft.map((off, i) => ({ x: originX + bx + off, y: shoeY[i] + bodyY }));
			// He walks the same line as the stilt tips, so his reaching fingers meet the near pole.
			const reach = (DROON.feet[1] - DROON.hand[1]) * DROON.h;
			const sway = (DROON.feet[0] - DROON.hand[0]) * DROON.h * DROON.aspect;
			const grab = { x: cur[1].x + 4, y: (cur[0].top + cur[1].top) / 2 - reach };
			const enter = doc.w + 12;
			const [drawing, midStep, backShoe] = droonParts;
			/**
			 * One tiptoe step: the front foot swaps to the drawn mid-step frame, the back shoe lifts
			 * onto its toe. @param {boolean} front @param {number} at @param {number} d
			 */
			const tiptoe = (front, at, d) => {
				if (front) {
					tl.set(midStep, { autoAlpha: 1 }, at);
					tl.set(drawing, { autoAlpha: 0 }, at);
					tl.set(drawing, { autoAlpha: 1 }, at + d * 0.8);
					tl.set(midStep, { autoAlpha: 0 }, at + d * 0.8);
				} else {
					tl.to(
						backShoe,
						{ keyframes: { x: [0, -5, 0], y: [0, -13, 0], rotation: [0, -20, 0] }, duration: d },
						at
					);
				}
			};

			tl.set(villain, { autoAlpha: 1, x: enter, y: grab.y, rotation: 0, transformOrigin: `${sway}px ${reach}px` }, t);
			const steps = 4;
			for (let s = 0; s < steps; s++) {
				const st = t + s * 0.3;
				tl.to(villain, { x: enter + ((grab.x - enter) * (s + 1)) / steps, duration: 0.24, ease: 'power1.inOut' }, st);
				tl.to(villain, { keyframes: { y: [grab.y, grab.y - 5, grab.y], rotation: [0, -3, 0] }, duration: 0.24 }, st);
				tiptoe(s % 2 === 0, st, 0.24);
			}
			const yank = t + steps * 0.3 + 0.1;
			const away = `+=${doc.w + 80 - grab.x}`;
			tl.to(villain, { rotation: 6, duration: 0.12, ease: 'power2.out' }, yank - 0.12);
			tl.set(tops, { x: (i) => loose[i].x, y: (i) => loose[i].y }, yank);
			tl.set(rig, { loose: 1 }, yank);
			tl.to(villain, { x: away, duration: 0.55, ease: 'power2.in' }, yank);
			for (let s = 0; s < 4; s++) tiptoe(s % 2 === 0, yank + s * 0.13, 0.13);
			tl.to([...tops, ...tips], { x: away, y: '-=24', duration: 0.55, ease: 'power2.in' }, yank);
			tl.set(rig, { on: 0, loose: 0 }, yank + 0.6);
			tl.set(villain, { autoAlpha: 0 }, yank + 0.6);

			const fall = yank + 0.05;
			tl.to(sticker, { x: 0, duration: 0.75, ease: 'power1.inOut' }, fall);
			tl.to(
				sticker,
				{
					keyframes: [
						{ y: bodyY - 18, duration: 0.25, ease: 'power2.out' },
						{ y: -6, duration: 0.5, ease: 'power2.in' }
					]
				},
				fall
			);
			tl.to(sticker, { keyframes: { rotation: [0, -22, 10, 0] }, duration: 0.75 }, fall);
			tl.to(sticker, { scaleX: 1, duration: 0.3, ease: 'power2.inOut' }, fall + 0.3);
			tl.to(
				sticker,
				{
					keyframes: [
						{ scaleX: 1.08, scaleY: 0.9, duration: 0.07, ease: 'power1.out' },
						{ scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' }
					]
				},
				fall + 0.75
			);
			headShake(tl, fall + 0.95);
			speak(tl, pickLine(LINES.droon), fall + 0.9, 1.6);
		};

		// Out to the end of the first line, wave, and back.
		const last = stones.at(-1) ?? cur[1];
		if (last.x - cur[1].x > 30) {
			walkTo([nearest(last.x - (cur[1].x - cur[0].x), last), last], 1, facingRight);
		}
		if (perched) {
			nizzardOut(tl, cue);
			perched = false;
		}
		const tw = cue;
		cue += 1.15;
		if (wave) {
			tl.to(
				wave,
				{
					keyframes: { rotation: [0, 22, -12, 22, -8, 0] },
					transformOrigin: '70% 80%',
					duration: 1.1
				},
				tw
			);
		}
		const hop = { y: '-=14', duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 3 };
		tl.to(sticker, hop, tw + 0.1);
		tl.to(tips, hop, tw + 0.1);
		speak(tl, pickLine(LINES.wave), tw + 0.1, 0.85);
		turn(-1, facingLeft);

		if (droon) {
			snatch();
		} else {
			walkTo(start, 0, facingLeft);
			turn(1, facingRight);
			// Step down: the poles shorten, then retract into the shoes.
			tl.to(sticker, { x: 0, y: -6, duration: 0.5, ease: 'power2.inOut' }, cue);
			tl.to(
				tips,
				{ x: (i) => originX + facingRight[i], y: (i) => shoeY[i] - 6, duration: 0.3, ease: 'power2.in' },
				cue + 0.5
			);
			tl.set(rig, { on: 0 }, cue + 0.8);
		}
		press(tl);
		return tl;
	}

	/** @param {SVGLineElement} el @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 */
	function setLine(el, x1, y1, x2, y2) {
		el.setAttribute('x1', String(x1));
		el.setAttribute('y1', String(y1));
		el.setAttribute('x2', String(x2));
		el.setAttribute('y2', String(y2));
	}
</script>

{#if running && pic}
	<div class="egg" use:portal style:width="{doc.w}px" style:height="{doc.h}px" aria-hidden="true">
		<svg class="stilts" width={doc.w} height={doc.h}>
			<filter id="egg-ink" bind:this={ink} filterUnits="userSpaceOnUse">
				<feTurbulence
					bind:this={turb}
					type="fractalNoise"
					baseFrequency="0.05"
					numOctaves="2"
					seed="1"
					result="noise"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="noise"
					scale="3"
					xChannelSelector="R"
					yChannelSelector="G"
					result="ink"
				/>
				<feMorphology in="ink" operator="dilate" radius="2" result="edge" />
				<feFlood flood-color={PAPER} />
				<feComposite in2="edge" operator="in" result="paper" />
				<feMerge>
					<feMergeNode in="paper" />
					<feMergeNode in="ink" />
				</feMerge>
			</filter>
			<g filter="url(#egg-ink)">
				{#each SHOES as _, i}
					<g bind:this={poles[i]} style:display="none">
						<line class="pole" />
						<line class="paint" />
						<line class="pole peg" />
					</g>
				{/each}
			</g>
		</svg>

		<!-- The container's origin is Lord Droon's reaching hand. -->
		<div class="droon" bind:this={villain}>
			<div
				class="droon-art"
				style:width="{DROON.h * DROON.aspect}px"
				style:height="{DROON.h}px"
				style:translate="{-DROON.hand[0] * 100}% {-DROON.hand[1] * 100}%"
			>
				{#each DROON_PARTS as part, i}
					<img
						bind:this={droonParts[i]}
						src={part.src}
						alt=""
						style:clip-path={part.clip}
						style:transform-origin={part.pivot}
						style:visibility={part.hidden ? 'hidden' : null}
					/>
				{/each}
			</div>
		</div>

		<!-- Only clickable while hiding. Keyboard users get him back from the home button instead. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="sticker"
			bind:this={sticker}
			onclick={onFound}
			style:left="{at.x}px"
			style:top="{at.y}px"
			style:width="{at.size}px"
			style:height="{at.size}px"
		>
			<img class="body" src={pic.currentSrc || pic.src} alt="" style:--cut={pct(CUT - 2)} />
			<img
				class="head"
				bind:this={head}
				src={pic.currentSrc || pic.src}
				alt=""
				style:--cut={pct(IMG - CUT - 2)}
				style:transform-origin="{pct(NECK[0])} {pct(NECK[1])}"
			/>
			{#each SHOES as [x, y], i}
				<i bind:this={shoes[i]} style:left={pct(x)} style:top={pct(y)}></i>
			{/each}
		</div>

		<!-- The container's origin is the perched bird's standing foot. -->
		<div class="nizzard" bind:this={bird}>
			<img class="perched" src={NIZZARD_IMGS[0]} alt="" />
			<img class="flying" src={NIZZARD_IMGS[1]} alt="" />
		</div>

		<div class="bubble-at" style:left="{bubbleAt.x}px" style:top="{bubbleAt.y}px">
			<p class="bubble" bind:this={bubble} style:--tail="{bubbleAt.tail}px">{line}</p>
		</div>
	</div>
{/if}

<style>
	.egg {
		position: absolute;
		left: 0;
		top: 0;
		overflow: clip;
		pointer-events: none;
		z-index: 50;
	}

	.stilts {
		position: absolute;
		left: 0;
		top: 0;
	}

	.stilts line {
		stroke-linecap: round;
	}

	.pole {
		stroke: #161412;
		stroke-width: 7;
	}

	.peg {
		stroke-width: 3.5;
	}

	.paint {
		stroke: #c8352b;
		stroke-width: 4.5;
	}

	/* Die-cut paper edge: stacked 1px offsets of the cream colour, then the lift shadow. */
	.sticker {
		--paper: 0;
		--lift: 0;
		--edge: rgb(243 237 224 / var(--paper));
		position: absolute;
		cursor: pointer;
		filter: drop-shadow(1px 0 0 var(--edge)) drop-shadow(-1px 0 0 var(--edge))
			drop-shadow(0 1px 0 var(--edge)) drop-shadow(0 -1px 0 var(--edge))
			drop-shadow(1px 0 0 var(--edge)) drop-shadow(-1px 0 0 var(--edge))
			drop-shadow(0 1px 0 var(--edge)) drop-shadow(0 -1px 0 var(--edge))
			drop-shadow(0 calc(var(--lift) * 10px) calc(var(--lift) * 6px) rgb(0 0 0 / calc(var(--lift) * 0.6)));
	}

	.sticker img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* The two halves overlap by a few rows under the ruff so no seam opens while the head turns. */
	.body {
		clip-path: inset(var(--cut) 0 0 0);
	}

	.head {
		clip-path: inset(0 0 var(--cut) 0);
	}

	.sticker i {
		position: absolute;
	}

	/* The cutouts already carry a white rim, so they only need the lift shadow. */
	.droon,
	.nizzard {
		position: absolute;
		left: 0;
		top: 0;
		visibility: hidden;
		filter: drop-shadow(0 6px 4px rgb(0 0 0 / 0.5));
	}

	.droon-art,
	.nizzard img {
		position: absolute;
		left: 0;
		top: 0;
	}

	.droon-art img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Each pose is shown on its own. */
	.nizzard img {
		visibility: hidden;
	}

	.perched {
		height: 72px;
		translate: -61% -96%;
	}

	.flying {
		height: 65px;
		translate: -50% -92%;
	}

	.bubble-at {
		position: absolute;
	}

	.bubble {
		position: absolute;
		left: 0;
		bottom: 0;
		visibility: hidden;
		transform-origin: var(--tail) 100%;
		rotate: -2deg;
		padding: 0.35rem 0.75rem;
		background: #f3ede0;
		color: #1d1d1c;
		border: 2px solid #161412;
		border-radius: 1rem;
		font-size: 0.85rem;
		white-space: nowrap;
	}

	.bubble::after {
		content: '';
		position: absolute;
		left: calc(var(--tail) - 6px);
		bottom: -7px;
		width: 11px;
		height: 11px;
		background: inherit;
		border-right: 2px solid #161412;
		border-bottom: 2px solid #161412;
		transform: rotate(45deg);
	}
</style>
