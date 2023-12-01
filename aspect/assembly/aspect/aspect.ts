
import {
    BigInt,
    FilterTxCtx,
    IAspectOperation,
    IAspectTransaction,
    ITransactionVerifier,
    OperationCtx,
    PostContractCallCtx,
    PostTxCommitCtx,
    PostTxExecuteCtx,
    PreContractCallCtx,
    PreTxExecuteCtx,
    VerifyTxCtx,
    sys
} from "@artela/aspect-libs";

/**
 * Brief intro:
 * 
 * This Aspect will recover signer address from the transaction signature (r,s,v).
 * And then it verify whether the signer is the session key of the EoA, if is, will return the EoA address to base layer.
 * Base layer retrieve the address and set it as the sender of this transaction.
 *
 * Implements:
 * 
 * * Function 'verifyTx': implements the session key verification logic.
 * * Function 'operation': implement the session key management logic. EoA call this function to register, update and delete its session keys.
 */
export class Aspect implements IAspectTransaction, IAspectOperation, ITransactionVerifier {

    // ***************************************
    // interface methods
    // ***************************************

    /**
     * Join point: transaction verify
     * 
     * When baselayer process tx's verification, it will call this join point method 
     * to verify transaction and retrieve the sender address of transaction.
     */
    verifyTx(ctx: VerifyTxCtx, validationData: Uint8Array): Uint8Array {
        // validation data encode rules:
        //     20 bytes: from
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     32 bytes: r
        //     32 bytes: s
        //     1 bytes: v

        // 0. decode validation data
        const params = sys.utils.uint8ArrayToHex(validationData);

        sys.require(params.length == 170, "illegal validation data, actual: " + params.length.toString());
        const from = params.slice(0, 40);
        const r = params.slice(40, 104);
        const s = params.slice(104, 168);
        const v = params.slice(168, 170);

        // 1. verify sig
        const msgHash = this.rmPrefix(sys.utils.uint8ArrayToHex(ctx.tx.msgHash.unwrap()));
        const syscallInput = msgHash
            + "00000000000000000000000000000000000000000000000000000000000000" + v
            + r
            + s;

        const ret = sys.hostApi.crypto.ecRecover(sys.utils.hexToUint8Array(syscallInput));
        const skey = sys.utils.uint8ArrayToHex(ret.subarray(12, 32));

        sys.require(skey != "", "illegal signature, verify fail");

        // 2. match session key from Aspect's state
        //        session keys in state are registered 
        const encodeSKey = sys.aspect.readonlyState(ctx).get<string>(
            SessionKey.getStateKey(this.rmPrefix(ctx.tx.content.unwrap().to), from, skey)
        ).unwrap();

        sys.require(encodeSKey != "", "illegal session key");

        // 2. match session key
        const sKeyObj = new SessionKey(encodeSKey);

        // 3. verify session key scope
        const method = sys.utils.parseCallMethod(ctx.tx.content.unwrap().input);
        sys.require(sKeyObj.getMethodArray().includes(this.rmPrefix(method)),
            "illegal session key scope, method isn't allowed. actual is " + method + ". detail: " + sys.utils.uint8ArrayToHex(ctx.tx.content.unwrap().input));

        // 4. return main key
        return sys.utils.hexToUint8Array(from);
    }

    /**
      * operation is an Aspect call.
      *
      * @param ctx  tx input
      * @param data
      * @return result of operation execution
      */
    operation(ctx: OperationCtx, data: Uint8Array): Uint8Array {
        // calldata encode rule
        // * 2 bytes: op code
        //      op codes lists:
        //           0x0001 | registerSessionKey
        //
        //           ** 0x10xx means read only op **
        //           0x1001 | getSessionKey
        //           0x0002 | verifySessionKeyScope
        //           0x0003 | verifySignature
        //           0x0004 | ecRecover
        //
        // * variable-length bytes: params
        //      encode rule of params is defined by each method

        const calldata = sys.utils.uint8ArrayToHex(data);
        const op = this.parseOP(calldata);
        const params = this.parsePrams(calldata);

        if (op == "0001") {
            this.registerSessionKey(this.rmPrefix(ctx.tx.content.unwrap().from), params, ctx);
            return new Uint8Array(0);
        }
        else if (op == "1001") {
            const ret = this.getSessionKey(params, ctx);
            return sys.utils.stringToUint8Array(ret);
        }
        else if (op == "1002") {
            const ret = this.verifySessionKeyScope(params, ctx);
            return ret ? sys.utils.stringToUint8Array("success") : sys.utils.stringToUint8Array("false");
        }
        else if (op == "1003") {
            const ret = this.verifySignature(params, ctx);
            return ret ? sys.utils.stringToUint8Array("success") : sys.utils.stringToUint8Array("false");
        }
        else if (op == "1004") {
            const ret = this.ecRecover(params, ctx);
            return sys.utils.stringToUint8Array(ret);
        }
        else {
            sys.revert("unknown op");
        }
        return new Uint8Array(0);
    }

    // ***************************************
    // internal methods
    // ***************************************

    parseOP(calldata: string): string {
        if (calldata.startsWith('0x')) {
            return calldata.substring(2, 6);
        } else {
            return calldata.substring(0, 4);
        }
    }

    parsePrams(calldata: string): string {
        if (calldata.startsWith('0x')) {
            return calldata.substring(6, calldata.length);
        } else {
            return calldata.substring(4, calldata.length);
        }
    }

    rmPrefix(data: string): string {
        if (data.startsWith('0x')) {
            return data.substring(2, data.length);
        } else {
            return data;
        }
    }

    registerSessionKey(eoa: string, params: string, ctx: OperationCtx): void {
        /**
         * params encode rules:
         *      20 bytes: session key
         *           eg. 1f9090aaE28b8a3dCeaDf281B0F12828e676c326
         *      20 bytes: contract address 
         *           eg. 388C818CA8B9251b393131C08a736A67ccB19297
         *      2 bytes: length of methods set
         *           eg. 0002
         *      variable-length: 4 bytes * length of methods set; methods set          
         *           eg. 0a0a0a0a0b0b0b0b
         *           means there are two methods: ['0a0a0a0a', '0b0b0b0b']
         */

        const encodeKey = params + eoa;

        const sKeyObj = new SessionKey(encodeKey);
        sKeyObj.verify();

        sys.aspect.mutableState(ctx).get<string>(sKeyObj.getStateKey()).set(sKeyObj.getEncodeKey());
    }

    getSessionKey(params: string, ctx: OperationCtx): string {
        return sys.aspect.mutableState(ctx).get<string>(params).unwrap();
    }

    verifySessionKeyScope(params: string, ctx: OperationCtx): bool {
        // params encode rules:
        //     20 bytes: from
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     20 bytes: to
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     4 bytes: method
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     20 bytes: signer
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f

        sys.require(params.length == 128, "illegal params");
        const from = params.slice(0, 40);
        const to = params.slice(40, 80);
        const method = params.slice(80, 88);
        const signer = params.slice(88, 128);

        return this.verifySessionKeyScope_(from, to, method, signer, ctx);
    }

    verifySignature(params: string, ctx: OperationCtx): bool {
        // params encode rules:
        //     20 bytes: from
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     20 bytes: to
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     32 bytes: hash
        //     32 bytes: r
        //     32 bytes: s
        //     1 bytes: v
        sys.require(params.length == 274, "illegal params");
        const from = params.slice(0, 40);
        const to = params.slice(40, 80);
        const hash = params.slice(80, 144);
        const r = params.slice(144, 208);
        const s = params.slice(208, 272);
        const v = params.slice(272, 274);

        return this.verifySignature_(from, to, hash, r, s, v, ctx);
    }

    ecRecover(params: string, ctx: OperationCtx): string {
        // params encode rules:
        //     20 bytes: from
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     20 bytes: to
        //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
        //     32 bytes: hash
        //     32 bytes: r
        //     32 bytes: s
        //     1 bytes: v
        sys.require(params.length == 274, "illegal params");
        const from = params.slice(0, 40);
        const to = params.slice(40, 80);
        const hash = params.slice(80, 144);
        const r = params.slice(144, 208);
        const s = params.slice(208, 272);
        const v = params.slice(272, 274);

        return this.ecRecover_(hash, r, s, v);
    }

    verifySessionKeyScope_(from: string, to: string, method: string, signer: string, ctx: OperationCtx): bool {

        const stateVal = sys.aspect.mutableState(ctx).get<string>(SessionKey.getStateKey(to, from, signer)).unwrap();

        sys.require(stateVal != '', "session key doesn't exist");

        const sKey = new SessionKey(stateVal);
        return sKey.getMethodArray().includes(method);
    }

    verifySignature_(from: string, to: string, hash: string, r: string, s: string, v: string, ctx: OperationCtx): bool {

        //[msgHash 32B][v 32B][r 32B][s 32B]
        const syscallInput = hash
            + "00000000000000000000000000000000000000000000000000000000000000" + v
            + r
            + s;

        const ret = sys.hostApi.crypto.ecRecover(sys.utils.hexToUint8Array(syscallInput));
        const signer = sys.utils.uint8ArrayToHex(ret.subarray(12, 32));

        if (signer == "") {
            return false;
        }

        const stateVal = sys.aspect.mutableState(ctx).get<string>(SessionKey.getStateKey(to, from, signer)).unwrap();

        if (stateVal == "") {
            return false;
        }

        return true;
    }

    ecRecover_(hash: string, r: string, s: string, v: string): string {

        //[msgHash 32B][v 32B][r 32B][s 32B]
        const syscallInput = hash
            + "00000000000000000000000000000000000000000000000000000000000000" + v
            + r
            + s;

        const ret = sys.hostApi.crypto.ecRecover(sys.utils.hexToUint8Array(syscallInput));
        const retHex = sys.utils.uint8ArrayToHex(ret);

        return retHex;
    }

    // ***********************************
    // base Aspect api
    // ***********************************
    isOwner(sender: string): bool { return false; }
    onContractBinding(contractAddr: string): bool { return true; }

    // ***********************************
    // unuse join point
    // ***********************************
    filterTx(ctx: FilterTxCtx): bool { return true }
    preTxExecute(ctx: PreTxExecuteCtx): void { }
    preContractCall(ctx: PreContractCallCtx): void { }
    postContractCall(ctx: PostContractCallCtx): void { }
    postTxExecute(ctx: PostTxExecuteCtx): void { }
    postTxCommit(ctx: PostTxCommitCtx): void { }
}

/**
* SessionKey object
*      1. getEncodeKey() will encode the key and return a hex string, which used in storage
*      2. other methods will decode the key and return fields of the key
* 
* SessionKey encode rules:
*      20 bytes: session key public key 
*           eg. 1f9090aaE28b8a3dCeaDf281B0F12828e676c326
*      20 bytes: contract address 
*           eg. 388C818CA8B9251b393131C08a736A67ccB19297
*      2 bytes: length of methods set
*           eg. 0002
*      variable-length: 4 bytes * length of methods set; methods set          
*           eg. 0a0a0a0a0b0b0b0b
*           means there are two methods: ['0a0a0a0a', '0b0b0b0b']
*      20 bytes: main key
*           eg. 388C818CA8B9251b393131C08a736A67ccB19297 
*/
class SessionKey {
    private encodeKey: string;

    constructor(encode: string) {
        this.encodeKey = encode;
    }

    verify(): void {
        sys.require(this.encodeKey.length > 84, "illegal encode session key");
        sys.require(this.encodeKey.length == 84 + 8 * this.getMethodCount().toInt32() + 40, "illegal encode session key");
    }

    getEncodeKey(): string {
        return this.encodeKey;
    }

    getSKey(): string {
        return this.encodeKey.slice(0, 40);
    }

    getContractAddress(): string {
        return this.encodeKey.slice(40, 80);
    }

    getMethodCount(): BigInt {
        return BigInt.fromString(this.encodeKey.slice(80, 84), 16);;
    }

    getRawMethodsSet(): string {
        return this.encodeKey.slice(84, 84 + 8 * this.getMethodCount().toInt32());
    }

    getMethodArray(): Array<string> {

        const array = new Array<string>();
        for (let i = 0; i < this.getMethodCount().toInt32(); ++i) {
            array[i] = this.getRawMethodsSet().slice(8 * i, 8 * (i + 1));
        }
        return array;
    }

    getEoA(): string {
        return this.encodeKey.slice(84 + 8 * this.getMethodCount().toInt32(), this.encodeKey.length);
    }

    getStateKey(): string {
        return sys.utils.uint8ArrayToHex(
            sys.hostApi.crypto.keccak(sys.utils.hexToUint8Array(this.getContractAddress() + this.getEoA() + this.getSKey())));
    }

    static getStateKey(contract: string, eoa: string, sKey: string): string {
        return sys.utils.uint8ArrayToHex(
            sys.hostApi.crypto.keccak(sys.utils.hexToUint8Array(contract + eoa + sKey)));
    }
}