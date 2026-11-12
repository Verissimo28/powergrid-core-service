export type Result<TValue, TError> = {
    readonly ok: true;
    readonly value: TValue;
} | {
    readonly ok: false;
    readonly error: TError;
};
export declare const ok: <TValue>(value: TValue) => Result<TValue, never>;
export declare const fail: <TError>(error: TError) => Result<never, TError>;
//# sourceMappingURL=result.d.ts.map