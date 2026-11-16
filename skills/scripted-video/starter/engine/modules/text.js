// `text`: words in a box. The text shrinks to fit its box, so a longer
// translation never runs off the stage.
//
// props   { text, role?, size?, color?, weight?, align?, valign?, lineHeight?,
//           bg?, radius?, padding?, italic?, mono?, fit? }
//   role  title | subtitle | kicker | body | caption | label | quote
//         (sets size, weight and colour; any prop overrides it)
//   text  may contain **strong** (drawn in the accent colour) and newlines
// commands
//   setText  { text }
//   setStyle { any of the props above }
import { fitBox, px, richText, set } from './dom.js';

/** Sizes are a share of the stage's short side, so one script reads the same at 1080p and 4K. */
export const ROLES = {
  title: { size: 0.085, weight: '800', lineHeight: 1.12 },
  subtitle: { size: 0.046, weight: '500', lineHeight: 1.25, color: 'dim' },
  kicker: { size: 0.034, weight: '700', lineHeight: 1.2, color: 'accent', upper: true },
  body: { size: 0.042, weight: '500', lineHeight: 1.35 },
  caption: { size: 0.034, weight: '500', lineHeight: 1.3, color: 'dim' },
  label: { size: 0.03, weight: '700', lineHeight: 1.2 },
  quote: { size: 0.05, weight: '500', lineHeight: 1.35, italic: true },
};

export default {
  type: 'text',
  commands: ['setText', 'setStyle'],
  validateProps: (p) => [...(typeof p.text === 'string' ? [] : ['text needs "text" (a string)']), ...(p.role === undefined || ROLES[p.role] ? [] : [`unknown role "${p.role}" (${Object.keys(ROLES).join(', ')})`])],
  init: (props) => ({ ...props }),
  validateCommand: (state, cmd) => (cmd.name === 'setText' && typeof cmd.args.text !== 'string' ? ['setText needs { text }'] : []),
  apply: (state, cmd) => (cmd.name === 'setText' ? { ...state, text: cmd.args.text } : { ...state, ...cmd.args }),

  mount(host, env) {
    const { box, inner, write } = fitBox(host);
    return {
      update(layer) {
        const s = layer.state;
        const role = ROLES[s.role ?? 'body'];
        const short = Math.min(env.stage.width, env.stage.height);
        const theme = env.theme;
        const color = s.color ?? (role.color ? theme[role.color] : theme.ink);
        set(box, {
          justifyContent: s.valign === 'top' ? 'flex-start' : s.valign === 'bottom' ? 'flex-end' : 'center',
          padding: px(s.padding ?? 0),
          background: s.bg ?? 'transparent',
          borderRadius: px(s.radius ?? 0),
        });
        set(inner, {
          color,
          fontFamily: s.mono ? theme.mono : theme.font,
          fontWeight: String(s.weight ?? role.weight),
          fontStyle: s.italic ?? role.italic ? 'italic' : 'normal',
          textAlign: s.align ?? 'center',
          lineHeight: String(s.lineHeight ?? role.lineHeight),
          letterSpacing: role.upper ? '0.12em' : 'normal',
          textTransform: role.upper ? 'uppercase' : 'none',
        });
        write(richText(s.text, theme.accent), s.size ?? role.size * short, JSON.stringify([s, layer.box.w, layer.box.h]), s.fit !== false);
      },
    };
  },
};
