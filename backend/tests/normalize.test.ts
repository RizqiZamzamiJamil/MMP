import { describe, expect, it } from 'vitest';
import { cleanText, normalizeMention, normalizeSource, parseEngagement, parsePublishedAt } from '../src/mentions/normalize.js';

describe('mention normalization', () => {
  it('removes HTML and executable content while decoding entities', () => {
    expect(cleanText('<p>Hello&nbsp;world</p><script>alert(1)</script>')).toBe('Hello world');
  });

  it('canonicalizes known source aliases', () => {
    expect(normalizeSource(' thestar ')).toBe('The Star');
    expect(normalizeSource('TWITTER')).toBe('Twitter');
  });

  it('parses the supported date and engagement formats', () => {
    expect(parsePublishedAt('11/08/2026')?.toISOString()).toBe('2026-08-11T00:00:00.000Z');
    expect(parsePublishedAt(1786435200)?.toISOString()).toBe('2026-08-11T08:00:00.000Z');
    expect(parseEngagement('1,204')).toBe(1204);
    expect(parsePublishedAt('not-a-date')).toBeNull();
  });

  it('rejects records without the idempotency key fields', () => {
    expect(() => normalizeMention({ content: 'text' })).toThrow('external_id and url are required');
  });
});
