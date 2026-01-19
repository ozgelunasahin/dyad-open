import type { JSONContent } from '@tiptap/core';

interface StarterNote {
	slug: string;
	title: string;
	content: JSONContent;
	wikilinks: string[];
}

export const STARTER_ENTRY_POINT = 'welcome';

export const STARTER_NOTES: StarterNote[] = [
	{
		slug: 'welcome',
		title: 'Welcome',
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: 'Welcome' }]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'This is a space for slow reading—a place to pause with texts, follow tangents, and let ideas breathe.'
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Click the blue links to open connected notes. Try clicking on ' },
						{
							type: 'wikilink',
							attrs: { target: 'robert-macfarlane', display: 'Robert Macfarlane' }
						},
						{ type: 'text', text: ' to begin.' }
					]
				},
				{ type: 'horizontalRule' },
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Creating links' }]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Double-click any note to edit it. To create a link, type ' },
						{ type: 'text', text: '[[', marks: [{ type: 'code' }] },
						{
							type: 'text',
							text: ' and start typing a note name. A menu will appear—select an existing note or create a new one.'
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Press ' },
						{ type: 'text', text: 'Escape', marks: [{ type: 'code' }] },
						{ type: 'text', text: ' when you are done editing.' }
					]
				}
			]
		},
		wikilinks: ['robert-macfarlane']
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
						{
							type: 'text',
							text: 'Robert Macfarlane is a British nature writer known for his explorations of landscape and language.'
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'In ' },
						{
							type: 'wikilink',
							attrs: { target: 'macfarlane-landmarks', display: 'Landmarks' }
						},
						{ type: 'text', text: ' he writes:' }
					]
				},
				{
					type: 'blockquote',
					content: [
						{
							type: 'paragraph',
							content: [
								{
									type: 'text',
									text: 'There are experiences of landscape that will always resist articulation, and of which words offer only a remote echo—or to which silence is by far the best response.'
								}
							]
						}
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
						{ type: 'text', text: ' (London: Penguin Books, 2016)' }
					]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'A meditation on the language of landscape and the ways words shape our perception of the natural world. Macfarlane collects glossaries of place-words from across Britain and Ireland—terms for weather, water, land, and light that are vanishing from common speech.'
						}
					]
				},
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: "The book argues that as we lose these words, we lose ways of seeing. Language doesn't just describe the world—it helps us notice it."
						}
					]
				}
			]
		},
		wikilinks: []
	}
];
