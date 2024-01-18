"use strict"

const Web3 = require('@artela/web3');
const fs = require("fs");
const BigNumber = require('bignumber.js');


// ******************************************
// init web3 and private key
// ******************************************
const configJson = JSON.parse(fs.readFileSync('./project.config.json', "utf-8").toString());
const web3 = new Web3(configJson.node);

let sk = fs.readFileSync("privateKey.txt", 'utf-8');
const account = web3.eth.accounts.privateKeyToAccount(sk.trim());
web3.eth.accounts.wallet.add(account.privateKey);

// ******************************************
// init aspect client
// ******************************************
// instantiate an instance of the contract
let aspectCore = web3.atl.aspectCore();
// instantiate an instance of aspect
let aspect = new web3.atl.Aspect();

// ******************************************
// test data
// ******************************************
let mainKey = rmPrefix(account.address);
let sKey = rmPrefix(account.address);;
let contract = "0250032b4a11478969dc4caaa11ecc2ea98cfc12";
let method1 = "0A0A0A0A";
let method2 = "0B0B0B0B";

/**
 * begin test
 */
async function f() {

    console.log('start testing operation');

    await deployAspect();
    await testRegisterSessionKey();
    await testGetSessionKey();
    await testVerifySessionKeyScope();
    await testVerifySignature();
    await testEcRecover();
    await testRegisterSessionKey2();
    await testGetAllSessionKey();
}

async function deployAspect() {
    // load aspect code and deploy
    let aspectCode = fs.readFileSync('./build/release.wasm', {
        encoding: "hex"
    });

    let aspectDeployData = aspect.deploy({
        data: '0x' + aspectCode,
        properties: [],
        joinPoints: ["VerifyTx"],
        paymaster: account.address,
        proof: '0x0'
    }).encodeABI();

    let tx = await getOperationTx(aspectDeployData);

    console.log('signed Aspect deploy Tx');

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);

    console.log('send Aspect deploy Tx');

    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    aspect.options.address = receipt.aspectAddress;

    console.log('receipt :\n', receipt);
    console.log('aspect address is: ', aspect.options.address);
}

async function testRegisterSessionKey() {

    printTestCase("testRegisterSessionKey: success");

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 20;

    let op = "0x0001";
    let params =
        sKey
        + contract
        + "0002" + method1 + method2
        + web3.eth.abi.encodeParameter('uint256', expireBlockHeight).slice(48, 64);
    ;

    console.log("op: ", op);
    console.log("params: ", params);

    let calldata = aspect.operation(op + params).encodeABI();

    let ret = await web3.eth.call({
        from: account.address,
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    let tx = await getOperationTx(calldata)

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('register session key result: sucess');
    console.log(receipt)
}

async function testRegisterSessionKey2() {

    printTestCase("testRegisterSessionKey2: success");

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 20;

    let op = "0x0001";
    let params =
        sKey.slice(2) + "CA" // register another key
        + contract
        + "0002" + method1 + method2
        + web3.eth.abi.encodeParameter('uint256', expireBlockHeight).slice(48, 64);
    ;

    console.log("op: ", op);
    console.log("params: ", params);

    let calldata = aspect.operation(op + params).encodeABI();

    let ret = await web3.eth.call({
        from: account.address,
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    let tx = await getOperationTx(calldata)

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log('register session key result: sucess');
    console.log(receipt)
}

async function testGetSessionKey() {
    printTestCase("testGetSessionKey: success");

    let op = "0x1001";
    let queryKey = web3.utils.keccak256("0x" + contract + mainKey + sKey);
    let params = rmPrefix(queryKey);
    let calldata = aspect.operation(op + params).encodeABI();

    console.log("op: ", op);
    console.log("params: ", params);

    let ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));
}

async function testVerifySessionKeyScope() {

    printTestCase("testVerifySessionKeyScope: success");

    let op = "0x1002";
    let params =
        mainKey
        + contract
        + method1
        + sKey;
    let calldata = aspect.operation(op + params).encodeABI();

    console.log("op: ", op);
    console.log("params: ", params);

    let ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));

    printTestCase("verifySessionKeyScope: fail");

    op = "0x1002";
    params =
        mainKey
        + contract
        + "0C0C0C0C" // illegal method
        + sKey;

    calldata = aspect.operation(op + params).encodeABI();

    console.log("op: ", op);
    console.log("params: ", params);

    ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));
}

async function testVerifySignature() {
    let chainId = await web3.eth.getChainId();

    printTestCase("testVerifySignature: success");

    let testCalldata = "010101";
    let tx = await getOperationTx(testCalldata);

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);

    console.log("signedTx: ", signedTx);
    console.log("v: ", getOriginalV(signedTx.v, chainId));

    let op = "0x1003"
    let params =
        mainKey
        + contract
        + rmPrefix(signedTx.messageHash)
        + rmPrefix(signedTx.r)
        + rmPrefix(signedTx.s)
        + rmPrefix(getOriginalV(signedTx.v, chainId));

    console.log("op: ", op);
    console.log("params: ", params);

    let calldata = aspect.operation(op + params).encodeABI();

    let ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));


    printTestCase("testVerifySignature: error sig");

    tx = await getOperationTx(testCalldata);
    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);

    console.log("signedTx: ", signedTx);
    console.log("v: ", getOriginalV(signedTx.v, chainId));

    op = "0x1003"
    params =
        mainKey
        + contract
        + rmPrefix(signedTx.messageHash)
        + rmPrefix(signedTx.r)
        + rmPrefix(signedTx.s)
        + "AA"; // illegal v

    console.log("op: ", op);
    console.log("params: ", params);

    calldata = aspect.operation(op + params).encodeABI();

    ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));


    printTestCase("testVerifySignature: error from");

    tx = await getOperationTx(testCalldata);
    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log("signedTx: ", signedTx);
    console.log("v: ", getOriginalV(signedTx.v, chainId));

    op = "0x1003"
    params =
        "CAFE857467b61f2e4b1a614a0d560cd75c0c076f" // illegal from
        + contract
        + rmPrefix(signedTx.messageHash)
        + rmPrefix(signedTx.r)
        + rmPrefix(signedTx.s)
        + rmPrefix(getOriginalV(signedTx.v, chainId));

    console.log("op: ", op);
    console.log("params: ", params);

    calldata = aspect.operation(op + params).encodeABI();

    ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));
}

async function testEcRecover() {
    let chainId = await web3.eth.getChainId();

    printTestCase("testEcRecover: success");

    let testCalldata = "010101";
    let tx = await getOperationTx(testCalldata);

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log("signedTx: ", signedTx);
    console.log("v: ", getOriginalV(signedTx.v, chainId));

    let op = "0x1004"
    let params =
        mainKey
        + contract
        + rmPrefix(signedTx.messageHash)
        + rmPrefix(signedTx.r)
        + rmPrefix(signedTx.s)
        + rmPrefix(getOriginalV(signedTx.v, chainId));

    console.log("op: ", op);
    console.log("params: ", params);

    let calldata = aspect.operation(op + params).encodeABI();

    let ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));

    printTestCase("testEcRecover: fail");

    tx = await getOperationTx(testCalldata);
    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log("signedTx: ", signedTx);
    console.log("v: ", getOriginalV(signedTx.v, chainId));

    op = "0x1004"
    params =
        mainKey
        + contract
        + rmPrefix(signedTx.messageHash)
        + rmPrefix(signedTx.r)
        + rmPrefix(signedTx.s)
        + "AA"; // illegal v

    console.log("op: ", op);
    console.log("params: ", params);

    calldata = aspect.operation(op + params).encodeABI();

    ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));
}

async function testGetAllSessionKey() {
    printTestCase("testGetAllSessionKey: success");

    let op = "0x1005";
    let params = mainKey;
    let calldata = aspect.operation(op + params).encodeABI();

    console.log("op: ", op);
    console.log("params: ", params);

    let ret = await web3.eth.call({
        to: aspectCore.options.address, // contract address
        data: calldata
    });

    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));
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

function printTestCase(intro) {
    console.log("\n\n" +
        "// ******************************************\n" +
        "// " + intro + "    \n" +
        "// ******************************************\n\n");
}
async function getOperationTx(calldata) {

    let nonce = await web3.eth.getTransactionCount(account.address);
    let gasPrice = await web3.eth.getGasPrice();
    let chainId = await web3.eth.getChainId();

    let tx = {
        from: account.address,
        nonce: nonce,
        gasPrice,
        gas: 8000000,
        data: calldata,
        to: aspectCore.options.address,
        chainId
    }

    console.log('tx: \n', tx);

    return tx;
}

f().then();
