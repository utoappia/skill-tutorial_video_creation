// The modules this project's videos can use: the standard ones, plus your own.
//
// A module is one object (see references/components.md in the skill, and
// engine/modules/cards.js for a short one to copy). To add one:
//
//   import ticker from './ticker.js';
//   export default [...standardModules, ticker];
//
// This file is loaded by the tools (in Node) and by the stage page (in the
// browser), so a module file must not touch `document` or `window` outside its
// `mount` function.
import { standardModules } from '../engine/modules/index.js';

export default [...standardModules];
