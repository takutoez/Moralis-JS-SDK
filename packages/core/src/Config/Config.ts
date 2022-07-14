import { CoreErrorCode, MoralisCoreError } from '../Error';

export class Config {
  private readonly items = new Map<string, ConfigItem<unknown>>();

  public registerKey<Value>(key: ConfigKey<Value>, validator?: ConfigKeyValidator<Value>) {
    if (this.items.has(key.name)) {
      throw new MoralisCoreError({
        code: CoreErrorCode.CONFIG_KEY_ALREADY_EXIST,
        message: `Key "${key.name}" is already registered`,
      });
    }
    this.items.set(key.name, { key, value: key.defaultValue, validator: validator as ConfigKeyValidator<unknown> });
  }

  public getKeys(): string[] {
    return Array.from(this.items.keys());
  }

  public get<Value>(keyOrName: ConfigKey<Value> | string): Value {
    return this.getItem(keyOrName).value;
  }

  public set<Value>(keyOrName: ConfigKey<Value> | string, value: Value) {
    const item = this.getItem<Value>(keyOrName);
    const error = item.validator ? item.validator(value) : null;
    if (error) {
      throw new MoralisCoreError({
        code: CoreErrorCode.CONFIG_INVALID_VALUE,
        message: `Cannot set this config. Invalid value for "${item.key.name}". ${error}`,
      });
    }
    item.value = value;
  }

  public merge(values: ConfigValues) {
    Object.keys(values).forEach((keyName) => {
      this.set(keyName, values[keyName]);
    });
  }

  public reset() {
    this.items.forEach((item) => {
      item.value = item.key.defaultValue;
    });
  }

  private getItem<Value>(keyOrName: ConfigKey<Value> | string): ConfigItem<Value> {
    const keyName = typeof keyOrName === 'string' ? keyOrName : keyOrName.name;
    const item = this.items.get(keyName);
    if (!item) {
      throw new MoralisCoreError({
        code: CoreErrorCode.CONFIG_KEY_NOT_EXIST,
        message: `Key "${keyName}" is unregistered. Have you registered all required modules?`,
      });
    }
    return item as ConfigItem<Value>;
  }
}

export type ConfigKeyValidator<Value> = (value: Value) => string | null;

interface ConfigItem<Value> {
  key: ConfigKey<Value>;
  value: Value;
  validator?: ConfigKeyValidator<Value>;
}

export interface ConfigValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [keyName: string]: any;
}

export interface ConfigKey<Value> {
  name: string;
  defaultValue: Value;
}
