// What Eric says. One pool per situation; pickLine() never repeats the line it just said.
export const LINES = {
	// Clicked before five.
	early: [
		'not ’til five o’clock',
		'stilts are for five. it isn’t five.',
		'work first, stilts at five',
		'the king says five o’clock sharp',
		'too early! the stilts are still asleep',
		'ask me again at five'
	],
	// Clicked after six, without having walked.
	late: [
		'you missed five o’clock',
		'the stilts went to bed at six',
		'stilt time’s over. back at five!',
		'too late! try five tomorrow'
	],
	// Already walked today.
	walked: [
		'that’s enough stilts for one day',
		'my legs are still wobbly',
		'one walk a day. king’s rules.',
		'same time tomorrow?'
	],
	// Fourth click onward in one visit.
	pester: [
		'poking won’t make it five',
		'still not five',
		'the clock goes tick, not poke',
		'I’m telling the king',
		'okay, okay… five o’clock. promise.'
	],
	// Sixth click: he’s had enough and goes to hide.
	hide: ['fine. I’m hiding.', 'bet you can’t find me', 'that’s it, I’m off', 'catch me if you can!'],
	// Clicked in his hiding spot.
	found: ['you found me!', 'aw, found me', 'okay, okay, I’m back'],
	// His empty spot was clicked twice, so he comes back on his own.
	gaveUp: ['fine, here I am', 'you’re no fun', 'I was right there!'],
	// Five o’clock, but reduced motion is on, so there’s no walk.
	now: ['it’s five o’clock!', 'stilt o’clock!'],
	// As the stilts come down.
	go: ['five o’clock!', 'stilt o’clock!', 'up, up, and up!', 'hooray, it’s five!'],
	// When the 👋 waves back.
	wave: ['hi!', 'hello down there!', 'hi, Motti!', 'nice wave!'],
	// A Nizzard is pecking the M in Motti.
	nizzard: [
		'shoo, nizzard!',
		'hey! no eating the letters!',
		'that’s Motti’s M!',
		'not the M!',
		'nizzards…'
	],
	// Right after Lord Droon snatches the stilts.
	droon: ['LORD DROON!', 'hey! those are the king’s!', 'MY STILTS!', 'not again…'],
	// The rest of the day after Droon took them.
	stolen: [
		'Lord Droon has my stilts',
		'no stilts ’til tomorrow. thanks, Droon.',
		'have you seen Lord Droon?',
		'the stilts are hidden somewhere…'
	]
};

let last = '';

/** @param {string[]} pool */
export function pickLine(pool) {
	const fresh = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
	last = fresh[Math.floor(Math.random() * fresh.length)];
	return last;
}
