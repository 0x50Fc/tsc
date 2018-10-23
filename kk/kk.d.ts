
export type int = number;
export type int32 = number;
export type int64 = number;
export type weak = undefined;

export interface map<TKey,TValue> {
    // @ts-ignore
    [key: TKey]: TValue;
}

export interface array<T> extends Array<T> {
}

