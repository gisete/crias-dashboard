import { pairChildrenToNames } from '@/lib/brevo-sync';

interface Row {
  id: string;
  name: string;
}

const ana: Row = { id: 'c1', name: 'Ana Silva' };
const beto: Row = { id: 'c2', name: 'Beto Silva' };

describe('pairChildrenToNames', () => {
  it('pairs an unchanged roster to the same rows', () => {
    const { pairs, removed } = pairChildrenToNames([ana, beto], ['Ana Silva', 'Beto Silva']);
    expect(pairs).toEqual([ana, beto]);
    expect(removed).toEqual([]);
  });

  it('keeps the surviving child on their own row when the first child is removed', () => {
    // The regression this whole change exists for: matching by position would
    // rename Ana's row to "Beto Silva" and remove Beto's, rewriting who
    // attended past sessions.
    const { pairs, removed } = pairChildrenToNames([ana, beto], ['Beto Silva']);
    expect(pairs).toEqual([beto]);
    expect(removed).toEqual([ana]);
  });

  it('removes the trailing child when the last child is removed', () => {
    const { pairs, removed } = pairChildrenToNames([ana, beto], ['Ana Silva']);
    expect(pairs).toEqual([ana]);
    expect(removed).toEqual([beto]);
  });

  it('matches names case- and whitespace-insensitively', () => {
    const { pairs, removed } = pairChildrenToNames([ana, beto], ['  beto silva  ']);
    expect(pairs).toEqual([beto]);
    expect(removed).toEqual([ana]);
  });

  it('never hands one child\'s row to a differently-named child', () => {
    // The reason there is no positional fallback: "Beto left, Carlos joined" is
    // indistinguishable from "Beto was renamed to Carlos", and guessing rename
    // would give Carlos every session Beto attended.
    const { pairs, removed } = pairChildrenToNames([ana, beto], ['Ana Silva', 'Carlos']);
    expect(pairs[0]).toEqual(ana);
    expect(pairs[1]).toBeUndefined();
    expect(removed).toEqual([beto]);
  });

  it('treats a corrected name as a new child rather than reusing the row', () => {
    // Costs a renamed child their history, which beats misattributing someone
    // else's to them.
    const typo: Row = { id: 'c3', name: 'Jaoo' };
    const { pairs, removed } = pairChildrenToNames([typo], ['João']);
    expect(pairs).toEqual([undefined]);
    expect(removed).toEqual([typo]);
  });

  it('signals an insert for a newly added child', () => {
    const { pairs, removed } = pairChildrenToNames([ana], ['Ana Silva', 'Beto Silva']);
    expect(pairs[0]).toEqual(ana);
    expect(pairs[1]).toBeUndefined();
    expect(removed).toEqual([]);
  });

  it('handles an add and a removal in the same sync', () => {
    const carla: Row = { id: 'c4', name: 'Carla' };
    const { pairs, removed } = pairChildrenToNames([ana, beto, carla], ['Ana Silva', 'Karla']);
    expect(pairs[0]).toEqual(ana);
    expect(pairs[1]).toBeUndefined();
    expect(removed).toEqual([beto, carla]);
  });

  it('removes every row when Brevo returns no names', () => {
    const { pairs, removed } = pairChildrenToNames([ana, beto], []);
    expect(pairs).toEqual([]);
    expect(removed).toEqual([ana, beto]);
  });

  it('marks all as inserts when there are no existing rows', () => {
    const { pairs, removed } = pairChildrenToNames([], ['Ana Silva']);
    expect(pairs).toEqual([undefined]);
    expect(removed).toEqual([]);
  });
});
