import { calculateAge } from '../age-calculator';

describe('calculateAge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-25'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns years and months for a child born 2 years and 6 months ago', () => {
    expect(calculateAge('2023-12-25')).toBe('2a 6m');
  });

  it('returns years only for a child born exactly 3 years ago', () => {
    expect(calculateAge('2023-06-25')).toBe('3a');
  });

  it('returns months only for a child born 8 months ago', () => {
    expect(calculateAge('2025-10-25')).toBe('8m');
  });

  it('returns 0m for a child born this month', () => {
    expect(calculateAge('2026-06-25')).toBe('0m');
  });
});
