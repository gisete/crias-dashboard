import { getSessaoCheiaMode } from '../sessao-cheia';

describe('getSessaoCheiaMode', () => {
  it('is "none" with no dates', () => {
    expect(getSessaoCheiaMode([])).toBe('none');
  });

  it('is "confirm" with exactly one date', () => {
    expect(getSessaoCheiaMode(['5 (manhã)'])).toBe('confirm');
  });

  it('is "choose" with two dates', () => {
    expect(getSessaoCheiaMode(['5 (manhã)', '12 (tarde)'])).toBe('choose');
  });

  it('is "choose" with three dates', () => {
    expect(getSessaoCheiaMode(['5 (manhã)', '12 (tarde)', '19 (manhã)'])).toBe('choose');
  });
});
