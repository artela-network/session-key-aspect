
        import {
            BigInt,
            ethereum,
            EthStateChange,
            State,
            StateChange,
            StateKey,
            StateChangeProperties,
            stringToUint8Array,
            arrayCopyPush,
            uint8ArrayToHex
        } from "@artela/aspect-libs";
    export namespace CounterState {
export class counter extends StateChange<BigInt> {

        constructor(addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(addr, 'Counter.counter', indices));
        }
        
            override unmarshalState(raw: EthStateChange) : State<BigInt> {
                let valueHex = uint8ArrayToHex(raw.value);
                let value = BigInt.fromString(valueHex, 16);
                return new State(uint8ArrayToHex(raw.account), value, raw.callIndex);
            }
        }
export class owner extends StateChange<string> {

        constructor(addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(addr, 'Counter.owner', indices));
        }
        
        override unmarshalState(raw: EthStateChange) : State<string> {
            return new State(uint8ArrayToHex(raw.account), uint8ArrayToHex(raw.value), raw.callIndex);
        }
        }
export class _balance_ extends StateChange<BigInt> {

        constructor(addr: string, indices: Uint8Array[] = []) {
            super(new StateChangeProperties(addr, '.balance', indices));
        }
        
            override unmarshalState(raw: EthStateChange) : State<BigInt> {
                let valueHex = uint8ArrayToHex(raw.value);
                let value = BigInt.fromString(valueHex, 16);
                return new State(uint8ArrayToHex(raw.account), value, raw.callIndex);
            }
        }
}
