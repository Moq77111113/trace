import { describe, it, expect } from 'vitest';
import { htmlToText } from '$lib/server/import/manual/html-to-text';

describe('htmlToText', () => {
  it('turns <br> into newlines', () => {
    expect(htmlToText('<p>line one<br>line two</p>')).toBe('line one\nline two');
  });

  it('separates paragraphs with a blank line', () => {
    expect(htmlToText('<p>a</p><p>b</p>')).toBe('a\n\nb');
  });

  it('decodes common entities', () => {
    expect(htmlToText('<p>a&nbsp;b &amp; c</p>')).toBe('a b & c');
  });

  it('decodes numeric entities', () => {
    expect(htmlToText('<p>caf&#233;</p>')).toBe('café');
  });

  it('keeps link text and drops the href', () => {
    expect(htmlToText('<p>see <a href="http://x">the doc</a></p>')).toBe('see the doc');
  });

  it('returns empty string for empty markup', () => {
    expect(htmlToText('<p></p>')).toBe('');
  });
});
