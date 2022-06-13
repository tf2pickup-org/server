import { Map } from './map';

describe('Map', () => {
  it('should serialize', async () => {
    const map = new Map('cp_badlands', 'etf2l_6v6_5cp');
    expect(await map.serialize()).toEqual({
      name: 'cp_badlands',
      execConfig: 'etf2l_6v6_5cp',
    });
  });
});
