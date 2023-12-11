const { Buffer } = require('buffer');

class SessionKeyAspectClient {

    constructor(web3client, aspectAddress) {
        this.web3 = web3client;

        this.aspectCore = this.web3.atl.aspectCore();
        this.aspect = new this.web3.atl.Aspect();
        this.aspect.options.address = aspectAddress;
    }

    async registerSessionKey(account, sessionKeyAddress, bindingContractAddress, bindingMethodSigSet, expireBlockNumber = 1000) {

        let tx = await this.registerSessionKeyUnsignTx(account.address, sessionKeyAddress, bindingContractAddress, bindingMethodSigSet, expireBlockNumber);

        let signedTx = await this.web3.eth.accounts.signTransaction(tx, account.privateKey);
        let receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return {
            success: receipt.status,
            receipt: receipt
        };
    }

    async registerSessionKeyByMetamask(walletAddress, sessionKeyAddress, bindingContractAddress, bindingMethodSigSet, expireBlockNumber = 1000) {

        let tx = await this.registerSessionKeyUnsignTx(walletAddress, sessionKeyAddress, bindingContractAddress, bindingMethodSigSet, expireBlockNumber);

        let metamaskTx = {
            from: tx.from,
            to: tx.to,
            value: "0x00",
            gas: "0x" + tx.gas.toString(16),
            data: tx.data
        }

        console.log("metamaskTx:", metamaskTx);
        let txHash = await this.web3.eth.sendTransaction(metamaskTx);

        return txHash;
    }

    async registerSessionKeyUnsignTx(walletAddress, sessionKeyAddress, bindingContractAddress, bindingMethodSigSet, expireBlockNumber = 1000) {

        sessionKeyAddress = this.rmPrefix(sessionKeyAddress);
        bindingContractAddress = this.rmPrefix(bindingContractAddress);

        let methodSetSize = this.uint8ToHex(bindingMethodSigSet.length);
        let currentBlockHeight = await this.web3.eth.getBlockNumber();
        let expireBlockHeight = currentBlockHeight + expireBlockNumber;

        let op = "0x0001";
        let params =
            sessionKeyAddress
            + bindingContractAddress
            + methodSetSize + this.processAndConcatStrings(bindingMethodSigSet)
            + this.rmPrefix(this.web3.eth.abi.encodeParameter('uint256', expireBlockHeight)).slice(48, 64);

        let calldata = this.aspect.operation(op + params).encodeABI();

        let tx = {
            from: walletAddress,
            to: this.aspectCore.options.address,
            gas: 8000000,
            data: calldata
        }

        return tx;
    }

    async getSessionKey(walletAddress, sessionKeyAddress, bindingContractAddress) {

        walletAddress = this.rmPrefix(walletAddress);
        sessionKeyAddress = this.rmPrefix(sessionKeyAddress);
        bindingContractAddress = this.rmPrefix(bindingContractAddress);

        let op = "0x1001";
        let queryKey = this.web3.utils.keccak256("0x" + bindingContractAddress + walletAddress + sessionKeyAddress);
        let params = this.rmPrefix(queryKey);
        let calldata = this.aspect.operation(op + params).encodeABI();

        let ret = await this.web3.eth.call({
            to: this.aspectCore.options.address, // contract address
            data: calldata
        });

        let encodeKey = this.web3.eth.abi.decodeParameter('string', ret);

        return this.decodeSessionKey(encodeKey);
    }

    async getSessioinKeyExpireHeight(walletAddress, sessionKeyAddress, bindingContractAddress) {
        let sessionKey = await this.getSessionKey(walletAddress, sessionKeyAddress, bindingContractAddress);
        return sessionKey.expireBlockHeight
    }

    decodeSessionKey(encodeKey) {
        // * SessionKey encode rules:
        // *      20 bytes: session key public key 
        // *           eg. 1f9090aaE28b8a3dCeaDf281B0F12828e676c326
        // *      20 bytes: contract address 
        // *           eg. 388C818CA8B9251b393131C08a736A67ccB19297
        // *      2 bytes: length of methods set
        // *           eg. 0002
        // *      variable-length: 4 bytes * length of methods set; methods set          
        // *           eg. 0a0a0a0a0b0b0b0b
        // *           means there are two methods: ['0a0a0a0a', '0b0b0b0b']
        // *      8 bytes: expire block height
        // *      20 bytes: main key
        // *           eg. 388C818CA8B9251b393131C08a736A67ccB19297 

        if (encodeKey.length == 0) {
            return {
                walletAddress: "",
                sessionKeyAddress: "",
                bindingContractAddress: "",
                bindingMethodSet: [],
                expireBlockHeight: 0
            }
        }

        if (encodeKey.length < 84) {
            throw new Error('illegal encode session key, length is :' + encodeKey.length);
        }

        let sessionKeyAddress = "0x" + encodeKey.slice(0, 40);
        let bindingContractAddress = "0x" + encodeKey.slice(40, 80);
        let methodSize = parseInt(encodeKey.slice(80, 84), 16);

        if (encodeKey.length < (8 * methodSize + 16 + 40)) {
            throw new Error('illegal encode session key, length is :' + encodeKey.length);
        }

        let expireBlockHeightPosition = 84 + 8 * methodSize;
        let bindingMethodSet = this.decodEncodeMethods(encodeKey.slice(84, expireBlockHeightPosition));
        let expireBlockHeight = parseInt(encodeKey.slice(expireBlockHeightPosition, expireBlockHeightPosition + 16), 16);
        let walletAddress = "0x" + encodeKey.slice(expireBlockHeightPosition + 16);

        return {
            walletAddress: walletAddress,
            sessionKeyAddress: sessionKeyAddress,
            bindingContractAddress: bindingContractAddress,
            bindingMethodSet: bindingMethodSet,
            expireBlockHeight: expireBlockHeight
        }
    }

    decodEncodeMethods(str) {
        const result = [];
        for (let i = 0; i < str.length; i += 8) {
            result.push("0x" + str.substring(i, i + 8));
        }
        return result;
    }

    rmPrefix(str) {
        return str.startsWith('0x') ? str.substring(2) : str;
    }

    processAndConcatStrings(strings) {
        return strings.map(str => {
            const processedStr = this.rmPrefix(str);
            if (processedStr.length !== 8) {
                throw new Error(`Processed string length is not 8: ${processedStr}`);
            }
            return processedStr;
        }).join('');
    }

    uint8ToHex(value) {
        if (value < 0 || value > 255) {
            throw new Error('Value is out of range for a uint8');
        }

        let buffer = Buffer.alloc(2);
        buffer.writeInt16BE(value, 0);
        return buffer.toString('hex').padStart(4, '0');
    }
}

module.exports = SessionKeyAspectClient;
