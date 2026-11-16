// The standard modules. A project adds its own in `modules/index.js` at the
// project root (see references/components.md in the skill).
import annotate from './annotate.js';
import { countdown, list, term } from './cards.js';
import chart from './chart.js';
import code from './code.js';
import { image, rect, video } from './media.js';
import scene from './scene.js';
import text from './text.js';

export const standardModules = [rect, image, video, text, scene, chart, code, list, countdown, term, annotate];
export { annotate, chart, code, countdown, image, list, rect, scene, term, text, video };
