# feat: Markdown Vault Parsing and Syncing

## Overview

Implement markdown file parsing so that notes can be authored as individual `.md` files with Obsidian-style frontmatter and wikilinks, while generating the existing JSON vault format for runtime consumption.

**Architecture Decision**: Markdown files are the **authoring format**, and a build script generates `index.json` for runtime. The JSON format remains the runtime source of truth, but markdown becomes the editing interface.

## Problem Statement

Currently, the vault content is stored in a single `static/vault/index.json` file with all notes pre-compiled. This is difficult to author and maintain. Users want to:

- Edit individual markdown files with familiar Obsidian syntax
- Use standard text editors and version control
- Have the same content structure parsed from markdown

## Proposed Solution

1. Add markdown files in `/content/notes/*.md`
2. Create a build script that parses markdown with gray-matter
3. Extract wikilinks using existing regex patterns
4. Generate `static/vault/index.json` matching current schema
5. Keep existing JSON as reference/fallback during development

## Technical Approach

### File Structure

```
content/
  notes/
    slow-reading.md
    isabelle-stengers.md
    robert-macfarlane.md
    silence.md
    ... (one file per note)
```

### Markdown File Format

```markdown
---
title: "Isabelle Stengers"
---

# Isabelle Stengers

Isabelle Stengers is a Belgian philosopher known for her work on the philosophy of science.

[[stengers-another-science|*Another Science Is Possible: A Manifesto for Slow Science*]] (Cambridge: Polity, 2018), 70.

See also: [[stengers-deceleration]]
```

### ID Derivation Rules

- **Note ID** = filename without `.md` extension
- IDs must be kebab-case (e.g., `isabelle-stengers`)
- Wikilink targets normalized: `[[Isabelle Stengers]]` → `isabelle-stengers`

### Frontmatter Schema

```typescript
interface NoteFrontmatter {
  title?: string;      // Display title (falls back to first H1 or filename)
  // Future extensions:
  // aliases?: string[];
  // tags?: string[];
}
```

### Output: Generated JSON

Must match existing schema exactly:

```typescript
interface Note {
  id: string;          // From filename
  title: string;       // From frontmatter or H1 or filename
  content: string;     // Raw markdown (without frontmatter)
  wikilinks: string[]; // Extracted link targets
}

interface Vault {
  notes: Record<string, Note>;
  entryPoint: string;  // Default: "slow-reading" or config
}
```

## Implementation Phases

### Phase 1: Build Script Foundation

**Files to create:**

| File | Purpose |
|------|---------|
| `scripts/build-vault.ts` | Main build script |
| `scripts/vault-config.ts` | Configuration (entry point, paths) |

**Build script responsibilities:**
1. Read all `.md` files from `/content/notes/`
2. Parse frontmatter with gray-matter
3. Extract title (frontmatter → H1 → filename)
4. Extract wikilinks using existing regex
5. Generate `static/vault/index.json`
6. Report broken links as warnings

**Install dependency:**
```bash
npm install gray-matter
```

### Phase 2: Create Markdown Content

**Files to create:**

Convert existing JSON notes to markdown files:

| File | Source Note ID |
|------|----------------|
| `content/notes/slow-reading.md` | `slow-reading` |
| `content/notes/isabelle-stengers.md` | `isabelle-stengers` |
| `content/notes/stengers-deceleration.md` | `stengers-deceleration` |
| `content/notes/stengers-another-science.md` | `stengers-another-science` |
| `content/notes/robert-macfarlane.md` | `robert-macfarlane` |
| `content/notes/macfarlane-landmarks.md` | `macfarlane-landmarks` |
| `content/notes/silence.md` | `silence` |
| `content/notes/john-cage.md` | `john-cage` |
| `content/notes/pauline-oliveros.md` | `pauline-oliveros` |
| `content/notes/rebecca-solnit.md` | `rebecca-solnit` |
| `content/notes/solnit-mother-of-all-questions.md` | `solnit-mother-of-all-questions` |
| `content/notes/slow-readers-methodology.md` | `slow-readers-methodology` |
| `content/notes/slow-readers-group.md` | `slow-readers-group` |
| `content/notes/lilla-watson.md` | `lilla-watson` |
| `content/notes/maturana-varela-autopoiesis.md` | `maturana-varela-autopoiesis` |
| `content/notes/stengers-ibid.md` | `stengers-ibid` |

### Phase 3: NPM Scripts Integration

**Files to modify:**

| File | Changes |
|------|---------|
| `package.json` | Add `build:vault` script |
| `vite.config.ts` | Optional: Add prebuild hook |

```json
{
  "scripts": {
    "build:vault": "tsx scripts/build-vault.ts",
    "prebuild": "npm run build:vault",
    "dev": "npm run build:vault && vite dev"
  }
}
```

### Phase 4: Validation & Error Handling

Build script should:
- **Warn** on broken wikilinks (link to non-existent note)
- **Fail** on duplicate note IDs
- **Allow** missing frontmatter (derive from content)
- **Fail** on invalid YAML frontmatter

## Code Examples

### scripts/build-vault.ts

```typescript
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = 'content/notes';
const OUTPUT_FILE = 'static/vault/index.json';
const ENTRY_POINT = 'slow-reading';

interface Note {
  id: string;
  title: string;
  content: string;
  wikilinks: string[];
}

interface Vault {
  notes: Record<string, Note>;
  entryPoint: string;
}

function extractWikilinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim().toLowerCase().replace(/\s+/g, '-'));
  }
  return [...new Set(links)];
}

function extractTitle(frontmatter: any, content: string, filename: string): string {
  // Priority: frontmatter.title > first H1 > filename
  if (frontmatter.title) return frontmatter.title;

  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function buildVault(): void {
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'));

  const notes: Record<string, Note> = {};
  const allIds = new Set<string>();

  for (const file of files) {
    const id = file.replace('.md', '');

    if (allIds.has(id)) {
      throw new Error(`Duplicate note ID: ${id}`);
    }
    allIds.add(id);

    const filepath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filepath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);

    notes[id] = {
      id,
      title: extractTitle(frontmatter, content, id),
      content,
      wikilinks: extractWikilinks(content)
    };
  }

  // Validate links
  for (const note of Object.values(notes)) {
    for (const link of note.wikilinks) {
      if (!allIds.has(link)) {
        console.warn(`⚠️  Broken link in ${note.id}: [[${link}]]`);
      }
    }
  }

  const vault: Vault = { notes, entryPoint: ENTRY_POINT };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vault, null, 2));

  console.log(`✅ Built vault with ${Object.keys(notes).length} notes`);
}

buildVault();
```

### Example Markdown: content/notes/isabelle-stengers.md

```markdown
---
title: "Isabelle Stengers"
---

# Isabelle Stengers

Isabelle Stengers is a Belgian philosopher known for her work on the philosophy of science.

[[stengers-another-science|*Another Science Is Possible: A Manifesto for Slow Science*]] (Cambridge: Polity, 2018), 70.

See also: [[stengers-deceleration]]
```

## Acceptance Criteria

### Functional Requirements

- [ ] Build script parses all `.md` files in `content/notes/`
- [ ] Frontmatter extracted with gray-matter
- [ ] Title derived from frontmatter, H1, or filename (in that order)
- [ ] Wikilinks extracted using existing regex pattern
- [ ] Output JSON matches existing `Vault` schema exactly
- [ ] Broken links reported as warnings (build continues)
- [ ] Duplicate IDs cause build failure

### Non-Functional Requirements

- [ ] Build completes in < 1 second for 20 notes
- [ ] Generated JSON is identical to hand-written JSON (for same content)
- [ ] Works with existing app without any changes to runtime code

### Quality Gates

- [ ] All existing notes converted to markdown
- [ ] Generated JSON validates against TypeScript types
- [ ] No changes required to Canvas.svelte or NoteCard.svelte

## Testing

1. **Unit test**: Build script functions (extractWikilinks, extractTitle)
2. **Integration test**: Build full vault, compare to expected JSON
3. **Manual test**: Run app with generated vault, verify all links work

## Migration Path

1. Create `content/notes/` directory
2. Convert each note from JSON to markdown file
3. Run build script to generate JSON
4. Compare generated JSON to original
5. Once verified, delete original JSON (it's now generated)

## Future Considerations

- **Watch mode**: Auto-rebuild on markdown changes during dev
- **Aliases**: Support frontmatter aliases for link resolution
- **Subdirectories**: Support `content/notes/people/*.md` structure
- **Backlinks**: Compute and include reverse links in JSON

## References

### Internal
- Current vault JSON: `static/vault/index.json`
- Wikilink regex: `src/lib/utils/markdown.ts:extractWikilinks()`
- Type definitions: `src/lib/types/index.ts`

### External
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing
- [Obsidian Wikilinks](https://help.obsidian.md/Linking+notes+and+files/Internal+links) - Syntax reference
