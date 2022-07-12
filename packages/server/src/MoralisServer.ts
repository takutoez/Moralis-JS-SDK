import {
  Module,
  CoreConfig,
  EvmAddress,
  EvmAddressish,
  MoralisCore,
  MoralisCoreProvider,
  MoralisServerError,
  ServerErrorCode,
} from '@moralisweb3/core';
import type Parse from 'parse';
import { initializeParse } from './initializeParse';
import { ServerEvent, ServerEventMap } from './events/ServerEvents';
import { Authentication } from './Authentication/Authentication';
import { Authenticate, LinkAddressOptions } from './AuthMethods/types';
import { assertInstance } from './assert/assertInstance';
import { getIPFS } from './utils/ipfs';
import { createSigningData } from './AuthMethods/utils/createSigningData';
import { SignUpOptions } from './AuthMethods/handleSignUp';
import { SignInOptions } from './AuthMethods/handleSignIn';
import { ServerConfigSetup } from './config/ServerConfigSetup';

export class MoralisServer extends Module<ServerEventMap> {
  public static readonly moduleName = 'server';

  public static create(core?: MoralisCore): MoralisServer {
    return new MoralisServer(core || MoralisCoreProvider.getDefault());
  }

  private _parse: typeof Parse | null = null;

  private authentication: Authentication = new Authentication(this.logger, this.core.config, this.emitter);

  private constructor(core: MoralisCore) {
    super(MoralisServer.moduleName, core);
  }

  public setup() {
    ServerConfigSetup.register(this.core.config);
  }

  start = async () => {
    this.logger.verbose('Initializing Parse server');
    this._parse = await initializeParse({
      appId: this.core.config.get(CoreConfig.appId),
      serverUrl: this.core.config.get(CoreConfig.serverUrl),
      environment: this.core.config.get(CoreConfig.buidEnvironment),
    });
    this.authentication.setServer(this._parse);

    this.logger.verbose('Initialize Parse server complete');
    this.emitter.emit(ServerEvent.INITIALIZED);
  };

  /**
   * Event listeners
   */

  onInitialized = (fn: ServerEventMap['Initialized']) => this.listen(ServerEvent.INITIALIZED, fn);
  onAuthenticating = (fn: ServerEventMap['Authenticating']) => this.listen(ServerEvent.AUTHENTICATING, fn);
  onAuthenticated = (fn: ServerEventMap['Authenticated']) => this.listen(ServerEvent.AUTHENTICATED, fn);
  onAutenticatingError = (fn: ServerEventMap['AuthenticatingError']) =>
    this.listen(ServerEvent.AUTHENTICATING_ERROR, fn);
  onLoggedOut = (fn: ServerEventMap['LoggedOut']) => this.listen(ServerEvent.LOGGED_OUT, fn);

  /**
   * General getters
   */

  get isInitialized() {
    return this._parse !== null;
  }

  /**
   * Authentication getters
   */

  /**
   * Authentication methods
   */

  authenticate: Authenticate = (method, options) => {
    return this.authentication.authenticate(method, options);
  };

  logout = () => {
    return this.authentication.logout();
  };

  signUp = async (options: SignUpOptions) => {
    return this.authentication.signUp(options);
  };

  signIn = async (options: SignInOptions) => {
    return this.authentication.signIn(options);
  };

  /**
   * Server utility methods
   */
  currentUser() {
    return this.instance().User.current();
  }

  currentUserAsync() {
    return this.instance().User.currentAsync();
  }

  fetchIPFS(ipfsHash: string) {
    return getIPFS(ipfsHash);
  }

  /**
   * Link address to user profile
   */
  linkEvmAddress = async (account: EvmAddressish, options?: LinkAddressOptions) => {
    const user = await this.User.currentAsync();
    if (!user) {
      throw new MoralisServerError({
        code: ServerErrorCode.NO_AUTHENTICATION,
        message: `No EVM authentication`,
      });
    }
    const address = EvmAddress.create(account).lowercase;

    const ethAddress = this.Object.extend('_EthAddress');
    const query = new this.Query(ethAddress);
    const ethAddressRecord = await query.get(address).catch(() => null);
    if (!ethAddressRecord) {
      const network = this.core.modules.getNetwork('evm');
      const data = await createSigningData({
        message: options?.message ?? 'Moralis: Link users',
        server: this.instance(),
      });
      const signature = await network.signMessage(data);

      if (!signature) {
        throw new MoralisServerError({
          code: ServerErrorCode.DATA_NOT_SIGNED,
          message: `Data not signed`,
        });
      }
      const authData = { id: address, signature, data };
      await user.linkWith('moralisEth', { authData });
    }
    user.addAllUnique('accounts', [address]);
    user.set('ethAddress', address);
    await user.save();
    return user;
  };

  /**
   * Unlink address to user profile
   */
  unlinkEvmAddress = async (account: EvmAddressish) => {
    const accountsLower = EvmAddress.create(account).lowercase;
    const ethAddress = this.Object.extend('_EthAddress');
    const query = new this.Query(ethAddress);
    const ethAddressRecord = await query.get(accountsLower);
    await ethAddressRecord.destroy();
    const user = await this.User.currentAsync();
    if (!user) {
      throw new MoralisServerError({
        code: ServerErrorCode.NO_AUTHENTICATION,
        message: `No EVM authentication`,
      });
    }
    const accounts = user.get('accounts') ?? [];
    const nextAccounts = accounts.filter((v: string) => v !== accountsLower);
    user.set('accounts', nextAccounts);
    user.set('ethAddress', nextAccounts[0]);
    await user._unlinkFrom('moralisEth');
    await user.save();
    return user;
  };

  /**
   * Parse access
   */
  instance() {
    return assertInstance(this._parse);
  }

  get ACL() {
    return this.instance().ACL;
  }

  get CLP() {
    // @ts-ignore Not typed in parse
    return this.instance().CLP;
  }

  get Cloud() {
    return this.instance().Cloud;
  }

  get File() {
    return this.instance().File;
  }

  get GeoPoint() {
    return this.instance().GeoPoint;
  }

  get Polygon() {
    return this.instance().Polygon;
  }

  get LocalDatastore() {
    // @ts-ignore Not typed in parse
    return this.instance().LocalDatastore;
  }

  get Object() {
    return this.instance().Object;
  }

  get Op() {
    // @ts-ignore Not typed in parse
    return this.instance().Op;
  }

  get Query() {
    return this.instance().Query;
  }

  get Relation() {
    return this.instance().Relation;
  }

  get Role() {
    return this.instance().Role;
  }

  get Session() {
    return this.instance().Session;
  }

  get Storage() {
    // @ts-ignore Not typed in parse
    return this.instance().Storage;
  }

  get User() {
    return this.instance().User;
  }

  get LiveQuery() {
    // @ts-ignore Not typed in parse
    return this.instance().LiveQuery;
  }

  get LiveQueryClient() {
    // @ts-ignore Not typed in parse
    return this.instance().LiveQueryClient;
  }
}
