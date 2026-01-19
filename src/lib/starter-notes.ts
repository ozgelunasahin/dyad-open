import type { JSONContent } from '@tiptap/core';

interface StarterNote {
	slug: string;
	title: string;
	content: JSONContent;
	wikilinks: string[];
}

export const STARTER_ENTRY_POINT = 'slow-reading';

export const STARTER_NOTES: StarterNote[] = [
	{
		slug: 'slow-reading',
		title: 'Slow Reading',
		content: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Double-click to edit. To create a link, type ' },
						{ type: 'text', text: '[[', marks: [{ type: 'code' }] },
						{ type: 'text', text: ' and start typing. Press ' },
						{ type: 'text', text: 'Escape', marks: [{ type: 'code' }] },
						{ type: 'text', text: ' when done.' }
					]
				},
				{ type: 'horizontalRule' },
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Slow Reading' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Whether enacted collectively or alone, silently or aloud, slow reading allows time to pause, rewind, doubt and pursue what at first sight may be tangents. Analogous to gardening, it is a means of tending to and ' },
						{ type: 'text', text: 'being in attendance', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' with what is read. As the Belgian philosopher ' },
						{ type: 'wikilink', attrs: { target: 'isabelle-stengers', display: 'Isabelle Stengers' } },
						{ type: 'text', text: ' points out: "speed demands and creates an insensitivity to everything that might slow things down: the frictions, the rubbing, the hesitations that make us feel we are not alone in the world."' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Urgency abounds, but we must not become desensitized under the pressure of its pace. Stengers argues for deceleration, noting: "Slowing down means becoming capable of learning again, becoming acquainted with things again, reweaving the bounds of interdependency." Although counter-intuitive amid multiple crises, slow reading hits the pause button and summons, as if by séance, an incongruous temporality.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Within that parallel time zone, slow reading acclimates itself to subtle movements and listens closely to declarations of doubt. ' },
						{ type: 'text', text: 'Wait, I\'m confused. There\'s just something I\'m not getting.', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' Without hesitation, we recalibrate, adjusting to linger with the lost or even admit that we ourselves are lost too. There is solidarity as we have all been there.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'R-E-A-D-I-N-G, in this way, is a practice that consciously aligns itself with the seemingly negative associations of slowness—of not being clever, lacking efficiency, not getting things done and simply not knowing. Rather than a hindrance, these qualities are generative. They create an opening for exploring questions, giving attention to shimmering lights in the margins and accounting for things escaping words altogether. As the British nature writer ' },
						{ type: 'wikilink', attrs: { target: 'robert-macfarlane', display: 'Robert Macfarlane' } },
						{ type: 'text', text: ' observes:' }
					]
				},
				{
					type: 'blockquote',
					content: [
						{
							type: 'paragraph',
							content: [
								{ type: 'text', text: 'There are experiences of landscape that will always resist articulation, and of which words offer only a remote echo—or to which silence is by far the best response. Nature does not name itself. Granite does not self-identify as igneous. Light has no grammar. Language is always late for its subject.' }
							]
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'In reading, ever so slowly at a snail\'s pace, we listen to distant echoes. Continuously thumbing through pages and fumbling for words, we preserve placeholders for the unsaid and ' },
						{ type: 'wikilink', attrs: { target: 'silence', display: 'silences' } },
						{ type: 'text', text: '. We nurture places for ' },
						{ type: 'text', text: 'what may have been', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' and the ' },
						{ type: 'text', text: 'yet-to-be', marks: [{ type: 'italic' }] },
						{ type: 'text', text: '.' }
					]
				}
			]
		},
		wikilinks: ['isabelle-stengers', 'robert-macfarlane', 'silence']
	},
	{
		slug: 'isabelle-stengers',
		title: 'Isabelle Stengers',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Isabelle Stengers' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Isabelle Stengers is a Belgian philosopher known for her work on the philosophy of science.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'wikilink', attrs: { target: 'stengers-another-science', display: 'Another Science Is Possible: A Manifesto for Slow Science' } },
						{ type: 'text', text: ' (Cambridge: Polity, 2018), 70.' }
					]
				}
			]
		},
		wikilinks: ['stengers-another-science']
	},
	{
		slug: 'stengers-another-science',
		title: 'Another Science Is Possible',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Another Science Is Possible' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Isabelle Stengers, ' },
						{ type: 'text', text: 'Another Science Is Possible: A Manifesto for Slow Science', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' (Cambridge: Polity, 2018), 70.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'A manifesto arguing for a slower, more careful approach to scientific practice that allows for genuine engagement with complexity.' }
					]
				}
			]
		},
		wikilinks: []
	},
	{
		slug: 'robert-macfarlane',
		title: 'Robert Macfarlane',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Robert Macfarlane' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Robert Macfarlane is a British nature writer known for his explorations of landscape and language.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'wikilink', attrs: { target: 'macfarlane-landmarks', display: 'Landmarks' } },
						{ type: 'text', text: ' (London: Penguin Books, 2016), 10.' }
					]
				}
			]
		},
		wikilinks: ['macfarlane-landmarks']
	},
	{
		slug: 'macfarlane-landmarks',
		title: 'Landmarks',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Landmarks' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Robert Macfarlane, ' },
						{ type: 'text', text: 'Landmarks', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' (London: Penguin Books, 2016), 10.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'A meditation on the language of landscape and the ways words shape our perception of the natural world.' }
					]
				}
			]
		},
		wikilinks: []
	},
	{
		slug: 'silence',
		title: 'Silence',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Silence' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Within my teaching practice, the presence of silence has always interested me. What does it do, how is it palpable, and how might its impact, if not lessons, be understood? I am fascinated by more abstract notions of silence as articulated and evoked by ' },
						{ type: 'wikilink', attrs: { target: 'john-cage', display: 'John Cage' } },
						{ type: 'text', text: ' and ' },
						{ type: 'wikilink', attrs: { target: 'pauline-oliveros', display: 'Pauline Oliveros' } },
						{ type: 'text', text: '.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'But also, there are political understandings of silence. In the ' },
						{ type: 'text', text: 'Mother of All Questions: Further Feminisms', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ', ' },
						{ type: 'wikilink', attrs: { target: 'rebecca-solnit', display: 'Rebecca Solnit' } },
						{ type: 'text', text: ' writes about layers of silence, saying:' }
					]
				},
				{
					type: 'blockquote',
					content: [
						{
							type: 'paragraph',
							content: [
								{ type: 'text', text: '"In the landscape of silence, the three realms might be: silence imposed from within; silence imposed from without; and silence that exists around what has not yet been named, recognized, described, or admitted. But they are not distinct; they feed each other; and what is unsayable becomes unknowable and vice versa, until something breaks."' }
							]
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'In another life, with more time and, yes, silence, I would like to explore and unpack these ideas further.' }
					]
				}
			]
		},
		wikilinks: ['john-cage', 'pauline-oliveros', 'rebecca-solnit']
	},
	{
		slug: 'john-cage',
		title: 'John Cage',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'John Cage' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'John Cage was an American composer known for his exploration of silence and chance in music, most famously in ' },
						{ type: 'text', text: "4'33\"", marks: [{ type: 'italic' }] },
						{ type: 'text', text: '.' }
					]
				}
			]
		},
		wikilinks: []
	},
	{
		slug: 'pauline-oliveros',
		title: 'Pauline Oliveros',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Pauline Oliveros' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Pauline Oliveros was an American composer and accordionist who developed "Deep Listening" as a practice of radical attention.' }
					]
				}
			]
		},
		wikilinks: []
	},
	{
		slug: 'rebecca-solnit',
		title: 'Rebecca Solnit',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Rebecca Solnit' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Rebecca Solnit is an American writer known for her essays on feminism, politics, and place.' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'wikilink', attrs: { target: 'solnit-mother-of-all-questions', display: 'Mother of All Questions: Further Feminisms' } },
						{ type: 'text', text: ' (London: Granta, 2017), 28.' }
					]
				}
			]
		},
		wikilinks: ['solnit-mother-of-all-questions']
	},
	{
		slug: 'solnit-mother-of-all-questions',
		title: 'Mother of All Questions',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Mother of All Questions' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Rebecca Solnit, ' },
						{ type: 'text', text: 'Mother of All Questions: Further Feminisms', marks: [{ type: 'italic' }] },
						{ type: 'text', text: ' (London: Granta, 2017), 28.' }
					]
				}
			]
		},
		wikilinks: []
	}
];
