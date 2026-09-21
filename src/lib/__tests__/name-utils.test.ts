import { shortenName } from '../name-utils';

describe('shortenName', () => {
  it('inserts the second word initial and keeps the particle preceding the last surname', () => {
    expect(shortenName('Afonso Sequeira Vieira da Luz')).toBe('Afonso S. da Luz');
  });

  it('drops a non-particle word before the last surname, keeping the second word initial', () => {
    expect(shortenName('Maria Carlota Fernandes Silveira da Mata Nogueira')).toBe(
      'Maria C. Nogueira',
    );
  });

  it('inserts the second word initial when no particle precedes the surname', () => {
    expect(shortenName('Vasco Braga Costa Felizardo')).toBe('Vasco B. Felizardo');
  });

  it('leaves a single-word name unchanged', () => {
    expect(shortenName('Pâmella')).toBe('Pâmella');
  });

  it('leaves a two-word name unchanged', () => {
    expect(shortenName('Sophia Blandy')).toBe('Sophia Blandy');
  });

  it('trims and collapses extra whitespace', () => {
    expect(shortenName('  Afonso   Sequeira  Vieira   da   Luz  ')).toBe('Afonso S. da Luz');
  });

  it('matches particles case-insensitively', () => {
    expect(shortenName('Afonso Sequeira Vieira DA Luz')).toBe('Afonso S. DA Luz');
  });

  it('inserts the second word initial alongside a kept particle', () => {
    expect(shortenName('Mariana Silva Bandeira de Vasconcelos')).toBe('Mariana S. de Vasconcelos');
  });

  it('distinguishes siblings with the same first and last name', () => {
    expect(shortenName('Maria Silva Santos')).toBe('Maria S. Santos');
    expect(shortenName('Maria João Santos')).toBe('Maria J. Santos');
  });
});
