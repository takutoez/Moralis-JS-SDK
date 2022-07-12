import { MoralisCore } from '@moralisweb3/core';
import { MoralisEvm } from '@moralisweb3/evm';
import { MockEvmConnector } from '../../src/MockConnector';

describe('Evm connect', () => {
  let core: MoralisCore;
  let connector: MockEvmConnector;
  let evm: MoralisEvm;

  beforeAll(() => {
    core = MoralisCore.create();
    connector = MockEvmConnector.create(core);
    evm = MoralisEvm.create(core);
    evm.connectors.register(connector);
    core.registerModule(evm);
    core.start();
  });

  it('can connect with a mock connector', async () => {
    const mockAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const mockChain = '0x3';

    const { account, chain, provider } = await evm.connect('mock', { account: mockAccount, chain: mockChain });

    expect(account?.checksum).toEqual(mockAccount);
    expect(chain?.hex).toEqual(mockChain);
    expect(provider).toBeDefined();
  });
});
