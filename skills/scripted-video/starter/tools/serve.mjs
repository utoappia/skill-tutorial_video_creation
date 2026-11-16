#!/usr/bin/env node
// The live player: watch a video in a browser while you work on it.
//
//   node tools/serve.mjs              http://127.0.0.1:4173
//   node tools/serve.mjs --port 5000
//
// The page plays the script with the recorded voice (if there is one), lets
// you scrub, step a frame at a time, switch language and layout, and list what
// is wrong with the frame on screen. Press R in the page after changing a script.
// It listens on this machine only.
import { main, parseArgs, serve } from './lib.mjs';

const args = parseArgs();
await main(async () => {
  const server = await serve({ port: Number(args.port ?? 4173) });
  console.log(`Player: ${server.url}/   (Ctrl+C to stop)`);
});
