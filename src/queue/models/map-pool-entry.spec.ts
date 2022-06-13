import { MapPoolEntry } from './map-pool-entry';

describe('MapPoolEntry', () => {
  it('should serialize', async () => {
    const map = new MapPoolEntry('cp_badlands', 'etf2l_6v6_5cp');
    expect(await map.serialize()).toEqual({
      name: 'cp_badlands',
      execConfig: 'etf2l_6v6_5cp',
    });
  });
});
