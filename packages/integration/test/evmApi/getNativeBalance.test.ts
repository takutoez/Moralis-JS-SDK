import MoralisEvmApi from '@moralisweb3/evm-api';
import { cleanEnvApi, setupEnvApi } from './setup';

describe('Moralis EvmApi', () => {
  let evmApi: MoralisEvmApi;

  beforeAll(() => {
    evmApi = setupEnvApi();
  });

  afterAll(() => {
    cleanEnvApi();
  });

  it('should get the native balance of an account', async () => {
    const result = await evmApi.account.getNativeBalance({
      address: '0x7dE3085b3190B3a787822Ee16F23be010f5F8686',
    });

    expect(result.toJSON().balance).toBe('39600000000000000');
    expect(result).toBeDefined();
  });

  it('should not get the native account balance and return an error code for an invalid address', async () => {
    const failedResult = await evmApi.account
      .getNativeBalance({
        address: '0x7dE3085b3190B3a787822Ee16F23be010f5F8686',
      })
      .then()
      .catch((err) => {
        return err;
      });

    expect(failedResult).toBeDefined();
    expect(
      evmApi.account.getNativeBalance({
        address: '0x7dE3085b3190B3a787822Ee16F23be010f5F868',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"[C0005] Invalid address provided"`);
  });
});
