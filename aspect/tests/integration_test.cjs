"use strict"

// imports
const Web3 = require('@artela/web3');
const fs = require("fs");
const {numberToHex} = require("@artela/web3-utils");
const BigNumber = require('bignumber.js');
const assert = require("assert");

const contractBin = fs.readFileSync('./build/contract/Counter.bin', "utf-8");
const abi = fs.readFileSync('./build/contract/Counter.abi', "utf-8")
const contractABI = JSON.parse(abi);
const EthereumTx = require('ethereumjs-tx').Transaction;
let aspectCode = fs.readFileSync('./build/release.wasm', {
    encoding: "hex"
});

// preparation

// ******************************************
// init web3 and private key
// ******************************************
const configJson = JSON.parse(fs.readFileSync('./project.config.json', "utf-8").toString());
const web3 = new Web3(configJson.node);

let sk = fs.readFileSync("privateKey.txt", 'utf-8');
const account = web3.eth.accounts.privateKeyToAccount(sk.trim());
web3.eth.accounts.wallet.add(account.privateKey);

// ******************************************
// load some basic info
// ******************************************
let gasPrice, chainId;

// ******************************************
// init aspect client
// ******************************************
// instantiate an instance of the aspect core contract
let aspectCore = web3.atl.aspectCore();

// ******************************************
// test data
// ******************************************
let mainKey = rmPrefix(account.address);

// ******************************************
// prepare 1. deploy contract
// ******************************************

async function nextBlockExpirationSessionKey() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 10;
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    await sendSessionKeyTx(sKeyAccount, contract, nonce++, contractCallData);
}

async function currentBlockExpirationSessionKey() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let expireBlockHeight = await web3.eth.getBlockNumber();
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    try {
        await sendSessionKeyTx(sKeyAccount, contract, nonce++, contractCallData);
    }  catch (e) {
        assert(e.message.includes("session key has expired"), "expected to be fail: " + e.message);
    }
}

async function notMatchSessionKey() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);
    let sKeyPrivKey2 = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount2 = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey2);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let expireBlockHeight = await web3.eth.getBlockNumber() + 100;
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    try {
        await sendSessionKeyTx(sKeyAccount2, contract, nonce++, contractCallData);
    }  catch (e) {
        assert(e.message.includes("illegal session key"), "expected to be fail: " + e.message);
    }
}

async function invalidContractMethod() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();

    let expireBlockHeight = await web3.eth.getBlockNumber() + 100;
    await registerSessionKey(aspect, sKeyAccount, contract, 'aabbccdd', expireBlockHeight, nonce++);

    try {
        await sendSessionKeyTx(sKeyAccount, contract, nonce++, contractCallData);
    }  catch (e) {
        assert(e.message.includes("illegal session key"), "expected to be fail: " + e.message);
    }
}

async function invalidSessionKey() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 100;

    try {
        await registerSessionKey(aspect, sKeyAccount, contract, '1234', expireBlockHeight, nonce++);
    } catch (e) {
        assert(e.message.includes("Transaction has been reverted by the EVM"), "expected to be fail: " + e.message);
    }
}

async function wrongContract() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let contract2 = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);
    await bindAspect(aspect, contract2, nonce++);
    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 1;
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    try {
        await registerSessionKey(aspect, sKeyAccount, contract2, contractCallMethod, expireBlockHeight, nonce++);
    } catch (e) {
        assert(e.message.includes("invalid session key"), "expected to be fail: " + e.message);
    }
}

async function bindContractOnly() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 1;
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    try {
        await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);
    } catch (e) {
        assert(e.message.includes("Transaction has been reverted by EVM"), "expected to be fail: " + e.message);
    }
}

async function bindEoAOnly() {
    let nonce = await web3.eth.getTransactionCount(account.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindEoA(aspect, account.address, nonce++);

    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 1;
    await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);

    try {
        await registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce++);
    } catch (e) {
        assert(e.message.includes("illegal session key"), "expected to be fail: " + e.message);
    }
}

async function sendSessionKeyTx(sKeyAccount, contract, nonce, callData) {
    let tx = {
        from: sKeyAccount.address,
        nonce: nonce,
        gasPrice,
        gas: 8000000,
        data: callData,
        to: contract.options.address,
        chainId
    };
    let signedTx = await web3.eth.accounts.signTransaction(tx, sKeyAccount.privateKey);
    let validationData = "0x"
        + mainKey
        + padStart(rmPrefix(signedTx.r), 64, "0")
        + padStart(rmPrefix(signedTx.s), 64, "0")
        + rmPrefix(getOriginalV(signedTx.v, chainId));
    let encodedData = web3.eth.abi.encodeParameters(['bytes', 'bytes'],
        [validationData, callData]);
    encodedData = '0xCAFECAFE' + web3.utils.keccak256(encodedData).slice(2, 10) + encodedData.slice(2);
    tx = {
        // from: sKeyAccount.address,
        nonce: numberToHex(nonce),
        gasPrice: numberToHex(gasPrice),
        gas: numberToHex(8000000),
        data: encodedData,
        to: contract.options.address,
        chainId: numberToHex(chainId)
    }

    let rawTx = '0x' + new EthereumTx(tx).serialize().toString('hex');
    const receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log("[send session key tx]", receipt);
}

async function registerSessionKey(aspect, sKeyAccount, contract, contractCallMethod, expireBlockHeight, nonce) {
    let sKey = rmPrefix(sKeyAccount.address);
    let sKeyContract = rmPrefix(contract.options.address);

    console.log("[register session key]", sKey, sKeyContract, contractCallMethod, expireBlockHeight);
    let op =
        "0x0001"
        + sKey
        + sKeyContract
        + "0001" + contractCallMethod
        + rmPrefix(web3.eth.abi.encodeParameter('uint256', expireBlockHeight)).slice(48, 64);

    const operationData = aspect.operation(op).encodeABI();
    const tx = {
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 8000000,
        to: aspectCore.options.address,
        data: operationData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log("[register session key]", "done");
}

async function bindEoA(aspect, eoa, nonce) {
    console.log("[binding eoa]", aspect.options.address, eoa);
    const bindingData = aspectCore.methods.bind(aspect.options.address, 1, eoa, 1).encodeABI();
    const tx = {
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 4000000,
        to: aspectCore.options.address,
        data: bindingData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    let aspects = await aspectCore.methods.aspectsOf(eoa).call({});
    let bounded = false;
    for (let i = 0; i < aspects.length; i++) {
        if (aspects[i].aspectId === aspect.options.address) {
            bounded = true;
            break;
        }
    }
    assert(bounded, "binding eoa failed");
    console.log("[binding eoa]", "success");
}
async function bindAspect(aspect, contract, nonce) {
    console.log("[bind aspect]", aspect.options.address, contract.options.address);
    const bindingData = contract.bind({
        priority: 1,
        aspectId: aspect.options.address,
        aspectVersion: 1,
    }).encodeABI();
    const tx = {
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 4000000,
        to: aspectCore.options.address,
        data: bindingData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    let aspects = await aspectCore.methods.aspectsOf(contract.options.address).call({});
    let bounded = false;
    for (let i = 0; i < aspects.length; i++) {
        if (aspects[i].aspectId === aspect.options.address) {
            bounded = true;
            break;
        }
    }
    assert(bounded, "binding contract failed");
    console.log("[bind aspect]", "done");
}

async function deployContract(nonce) {
    console.log("[deploy contract]", "start");
    let contract = new web3.eth.Contract(contractABI);
    contract = await contract.deploy({data: contractBin}).send({
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 4000000,
    });
    console.log("[deploy contract]", contract.options.address);
    return contract;
}

async function deployAspect(nonce) {
    console.log("[deploy aspect]", "start");
    let aspect = new web3.atl.Aspect();
    let aspectDeployData = aspect.deploy({
        data: '0x' + aspectCode,
        properties: [],
        joinPoints: ["VerifyTx"],
        paymaster: account.address,
        proof: '0x0'
    }).encodeABI();
    const tx = {
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 4000000,
        to: aspectCore.options.address,
        data: aspectDeployData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    aspect.options.address = receipt.aspectAddress;
    console.log("[deploy aspect]", aspect.options.address);
    return aspect;
}

function rmPrefix(data) {
    if (data.startsWith('0x')) {
        return data.substring(2, data.length);
    } else {
        return data;
    }
}

function getOriginalV(hexV, chainId_) {
    const v = new BigNumber(hexV, 16);
    const chainId = new BigNumber(chainId_);
    const chainIdMul = chainId.multipliedBy(2);

    const originalV = v.minus(chainIdMul).minus(8);

    const originalVHex = originalV.toString(16);

    return originalVHex;
}

function padStart(str, targetLength, padString) {
    targetLength = Math.max(targetLength, str.length);
    padString = String(padString || ' ');

    if (str.length >= targetLength) {
        return str;
    } else {
        targetLength = targetLength - str.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
        }
        return padString.slice(0, targetLength) + str;
    }
}

async function testEntry() {
    console.log("test start");
    console.log("============= next block expiration start =============")
    await nextBlockExpirationSessionKey();
    console.log("============= next block expiration end =============")
    console.log("============= current block expiration start =============")
    await currentBlockExpirationSessionKey();
    console.log("============= current block expiration end =============")
    console.log("============= not match session key start =============")
    await notMatchSessionKey();
    console.log("============= not match session key end =============")
    console.log("============= invalid contract method start =============")
    await invalidContractMethod();
    console.log("============= invalid contract method end =============")
    console.log("============= invalid session key start =============")
    await invalidSessionKey();
    console.log("============= invalid session key end =============")
    console.log("============= wrong contract start =============")
    await wrongContract();
    console.log("============= wrong contract end =============")
    console.log("============= bind contract only start =============")
    await bindContractOnly();
    console.log("============= bind contract only end =============")
    console.log("============= bind eoa only start =============")
    await bindEoAOnly();
    console.log("============= bind eoa only end =============")
}

async function preparation() {
    gasPrice = await web3.eth.getGasPrice();
    chainId = await web3.eth.getChainId();
}

preparation().then(r => {
    testEntry().then(r => {
        console.log("test done");
    });
});
