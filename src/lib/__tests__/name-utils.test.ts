import { shortenName } from '../name-utils';

describe('shortenName', () => {
  it('keeps the particle immediately preceding the last surname', () => {
    expect(shortenName('Afonso Sequeira Vieira da Luz')).toBe('Afonso da Luz');
  });

  it('drops a non-particle word before the last surname', () => {
    expect(shortenName('Maria Carlota Fernandes Silveira da Mata Nogueira')).toBe(
      'Maria Nogueira',
    );
  });

  it('returns first + last name when no particle precedes the surname', () => {
    expect(shortenName('Vasco Braga Costa Felizardo')).toBe('Vasco Felizardo');
  });

  it('leaves a single-word name unchanged', () => {
    expect(shortenName('Pâmella')).toBe('Pâmella');
  });

  it('leaves a two-word name unchanged', () => {
    expect(shortenName('Sophia Blandy')).toBe('Sophia Blandy');
  });

  it('trims and collapses extra whitespace', () => {
    expect(shortenName('  Afonso   Sequeira  Vieira   da   Luz  ')).toBe('Afonso da Luz');
  });

  it('matches particles case-insensitively', () => {
    expect(shortenName('Afonso Sequeira Vieira DA Luz')).toBe('Afonso DA Luz');
  });
});
