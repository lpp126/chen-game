import type { CSSProperties } from 'react';

/** iOS/Safari：粗体与非 emoji 字体栈常把彩色 emoji 洗成空白 */
export const COLOR_EMOJI_FONT =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

export const emojiSafeStyle: CSSProperties = {
  fontFamily: COLOR_EMOJI_FONT,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1
};
