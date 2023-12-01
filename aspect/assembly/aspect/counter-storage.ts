
        import {
            BigInt,
            ethereum,
            EthStateChange,
            State,
            StateChange,
            StateKey,
            StateChangeProperties,
            TraceCtx,
            sys
        } from "@artela/aspect-libs";
    export namespace CounterState {
export class counter extends StateChange<BigInt> {

        constructor(ctx: TraceCtx, addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(ctx, addr, 'Counter.counter', indices));
        }
        
            override unmarshalState(raw: EthStateChange) : State<BigInt> {
                let valueHex = sys.utils.uint8ArrayToHex(raw.value);
                let value = BigInt.fromString(valueHex, 16);
                return new State(raw.account, value, raw.callIndex);
            }
        }
export class owner extends StateChange<string> {

        constructor(ctx: TraceCtx, addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(ctx, addr, 'Counter.owner', indices));
        }
        
        override unmarshalState(raw: EthStateChange) : State<string> {
            return new State(raw.account, sys.utils.uint8ArrayToHex(raw.value), raw.callIndex);
        }
        }
export class balances_MappingValue extends StateChange<BigInt> {

        constructor(ctx: TraceCtx, addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(ctx, addr, 'Counter.balances', indices));
        }
        
            override unmarshalState(raw: EthStateChange) : State<BigInt> {
                let valueHex = sys.utils.uint8ArrayToHex(raw.value);
                let value = BigInt.fromString(valueHex, 16);
                return new State(raw.account, value, raw.callIndex);
            }
        }
export class balances extends StateKey<string> {

        constructor(ctx: TraceCtx, addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(ctx, addr, 'Counter.balances', indices));
        }
        
            @operator("[]")
            get(key: string): balances_MappingValue {
                // @ts-ignore
                return new balances_MappingValue(this.__properties__.ctx, this.__properties__.account, 
                                         sys.utils.arrayCopyPush(this.__properties__.indices, this.parseKey(key)));
            }
        
            protected parseKey(key: string): Uint8Array {
                return ethereum.Address.fromHexString(key).encodeUint8Array();
            }
        childrenIndexValue(index: u64): ethereum.Address {
          return ethereum.Address.fromUint8Array(this.__children__[index]);
        }
            childChangeAt(index: u64): balances_MappingValue {
                // @ts-ignore
                return new balances_MappingValue(this.__properties__.ctx, this.__properties__.account, 
                                         sys.utils.arrayCopyPush(this.__properties__.indices, this.__children__[index]));
            }
        }
export class _balance_ extends StateChange<BigInt> {

        constructor(ctx: TraceCtx, addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(ctx, addr, '.balance', indices));
        }
        
            override unmarshalState(raw: EthStateChange) : State<BigInt> {
                let valueHex = sys.utils.uint8ArrayToHex(raw.value);
                let value = BigInt.fromString(valueHex, 16);
                return new State(raw.account, value, raw.callIndex);
            }
        }
}
