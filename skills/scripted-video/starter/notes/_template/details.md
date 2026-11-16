# Details you can delete: {{title}}

**Only for a longer version the requester asked for.** The default video is the core and has no
details; then this file stays as it is.

A longer version is made of the **core**, which is a complete video alone, and the named
**details** below. Each detail can be deleted by itself and the rest still makes sense.

Fill this file with the output of

```
node tools/dump.mjs {{id}} --details > notes/{{id}}/details.md
```

after the voice is recorded, and again after every change to the script.

To delete details, list their names in the script, `videos/{{id}}.mjs`:

```js
const v = video('{{id}}', '…', { omit: ['name-of-a-detail', 'another'] });
```

then run `node tools/tts.mjs {{id}}`, `node tools/check.mjs {{id}} --strict` and
`node tools/export.mjs {{id}}` again. Recorded lines are reused; only the timing is rebuilt.
To try a cut first: `node tools/check.mjs {{id}} --omit name,another`. `--omit all` gives the
core alone. If the list has a second layer ("deep"), `--omit deep` (or `omit: ['deep']`) leaves
out that whole layer, and deleting a detail also deletes the deep details listed as going with
it.
