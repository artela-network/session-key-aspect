"use strict"

// imports
const path = require('path');
const Web3 = require('@artela/web3');
const fs = require("fs");
const { numberToHex } = require("@artela/web3-utils");
const BigNumber = require('bignumber.js');
const assert = require("assert");
const EventEmitter = require('events');
const { exit } = require('process');

const workingDir = "/home/luke/go/src/github.com/artela-network/session-key-aspect/aspect";
const contractBin = fs.readFileSync(path.join(workingDir, 'build/contract/Counter.bin'), "utf-8");
const abi = fs.readFileSync(path.join(workingDir, 'build/contract/Counter.abi'), "utf-8")
const contractABI = JSON.parse(abi);
const EthereumTx = require('ethereumjs-tx').Transaction;
let aspectCode = fs.readFileSync(path.join(workingDir, 'build/release.wasm'), {
    encoding: "hex"
});

// preparation

// ******************************************
// init web3 and private key
// ******************************************
const configJson = JSON.parse(fs.readFileSync(path.join(workingDir, 'project.config.json'), "utf-8").toString());
const web3 = new Web3(configJson.node);

let sk = fs.readFileSync(path.join(workingDir, "privateKey.txt"), 'utf-8');
const mainAccount = web3.eth.accounts.privateKeyToAccount(sk.trim());
web3.eth.accounts.wallet.add(mainAccount.privateKey);

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
let mainKey = rmPrefix(mainAccount.address);

// ******************************************
// prepare 1. deploy contract
// ******************************************

const sentTransactionHashes = new Set();
const failureTransactionHashes = new Set();
function addSentTransactionHash(hash) {
    sentTransactionHashes.add(hash);
}

function checkAndRemoveTransactionHash(hash) {
    if (sentTransactionHashes.has(hash)) {
        sentTransactionHashes.delete(hash);
    }
}

const TPSGenerateEOA = 30
const TPSBindEOAAspect = 30
const TPSGenerateSK = TPSGenerateEOA
const TPSRegisterSK = 50
const TPSSendSK = 20

const duration = 500;
async function fetchBlocks() {
    try {
        let current = await web3.eth.getBlockNumber();

        while (true) {
            let latest = await web3.eth.getBlockNumber();
            if (latest == current) {
                await new Promise(r => setTimeout(r, duration));
                continue;
            }

            const block = await web3.eth.getBlock(current);
            console.log(`Block Number: ${block.number}, txs: ${block.transactions.length}`);
            for (const tx of block.transactions) {
                const receipt = await web3.eth.getTransactionReceipt(tx);
                if (receipt && receipt.status) {
                    checkAndRemoveTransactionHash(tx);
                } else {
                    failureTransactionHashes.add(tx);
                }
            }

            current++;
        }
    } catch (error) {
        console.error('Error fetching blocks:', error);
    }
}

async function checkSentTransactionHashesLength() {
    while (true) {
        const sendlen = sentTransactionHashes.size;
        const faillen = failureTransactionHashes.size;
        if (sendlen > faillen) {
            console.log(`waitting tx to finish: ${sendlen - faillen}`);
            await new Promise(r => setTimeout(r, 100));
        } else {
            if (faillen == 0) {
                console.log(`waitting tx to finish: 0`);
                console.log("all tx found.");
                sentTransactionHashes.clear();
                failureTransactionHashes.clear();
                break;
            } else {
                console.log("some transaction failed", failureTransactionHashes);
                process.exit();
            }
        }
    }
}

async function multiEoAWithMultiSessionKey() {
    let nonce = await web3.eth.getTransactionCount(mainAccount.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);

    const eoaAccountNum = 300;
    const skAccountNum = 300;

    // generate EoA accounts
    const generateEOA = "[generate EoA accounts]";
    console.log(generateEOA, eoaAccountNum);
    let accounts = await generateAccounts(eoaAccountNum, "0.01", nonce, generateEOA);
    await checkSentTransactionHashesLength();
    console.log(generateEOA, "done");

    // bind EoA with Aspect
    const bindEOAAspect = "[bind EoA with Aspect]";
    console.log(bindEOAAspect, eoaAccountNum);
    let txsToSend = [];
    for (let i = 0; i < accounts.length; i++) {
        txsToSend.push(await generateBindEoATx(aspect, accounts[i]));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSBindEOAAspect, bindEOAAspect);
    await checkSentTransactionHashesLength();
    console.log(bindEOAAspect, "done");

    // generate session key accounts
    const generateSK = "[generate session key accounts]";
    console.log(generateSK, skAccountNum)
    nonce = await web3.eth.getTransactionCount(mainAccount.address);
    let skAccounts = await generateAccounts(skAccountNum, 0, nonce, generateSK);
    await checkSentTransactionHashesLength();
    console.log(generateSK, "done")

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 10000000;

    // register session key
    const registerSK = "[register session key]"
    console.log(registerSK, skAccountNum)
    txsToSend = [];
    for (let i = 0; i < skAccounts.length; i++) {
        const eoaNonce = await web3.eth.getTransactionCount(accounts[i].address);
        txsToSend.push(await generateRegisterSessionKeyTx(aspect, accounts[i], eoaNonce, skAccounts[i], contract, contractCallMethod, expireBlockHeight));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSRegisterSK, registerSK)
    await checkSentTransactionHashesLength();
    console.log(registerSK, "done")

    // send session key tx
    const sendSK = "[send session key tx]";
    console.log(sendSK, skAccountNum)
    txsToSend = [];
    let nonces = {};
    for (let i = 0; i < skAccounts.length; i++) {
        if (!nonces[accounts[i].address]) {
            nonces[accounts[i].address] = await web3.eth.getTransactionCount(accounts[i].address);
        }
        txsToSend.push(await generateSessionKeyTx(skAccounts[i], accounts[i], nonces[accounts[i].address]++, contract, contractCallData, false));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSSendSK, sendSK);
    await checkSentTransactionHashesLength();
    console.log(sendSK, "done")
}

async function oneEoAWithMultiSessionKey() {
    let nonce = await web3.eth.getTransactionCount(mainAccount.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);

    const eoaAccountNum = 1;
    const skAccountNum = 300;

    // generate EoA accounts
    const generateEOA = "[generate EoA accounts]";
    console.log(generateEOA, eoaAccountNum);
    let accounts = await generateAccounts(eoaAccountNum, "0.01", nonce, generateEOA);
    await checkSentTransactionHashesLength();
    console.log(generateEOA, "done");

    // bind EoA with Aspect
    const bindEOAAspect = "[bind EoA with Aspect]";
    console.log(bindEOAAspect, eoaAccountNum);
    let txsToSend = [];
    for (let i = 0; i < accounts.length; i++) {
        txsToSend.push(await generateBindEoATx(aspect, accounts[i]));
    }
    await sendTransactionsAtFixedRate(txsToSend, 30, bindEOAAspect);
    await checkSentTransactionHashesLength();
    console.log(bindEOAAspect, "done");

    // generate session key accounts
    const generateSK = "[generate session key accounts]";
    console.log(generateSK, skAccountNum)
    nonce = await web3.eth.getTransactionCount(mainAccount.address);
    let skAccounts = await generateAccounts(skAccountNum, 0, nonce, generateSK);
    await checkSentTransactionHashesLength();
    console.log(generateSK, "done")

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 10000000;

    // register session key
    const registerSK = "[register session key]"
    console.log(registerSK, skAccountNum)
    txsToSend = [];
    let eoaNonce = await web3.eth.getTransactionCount(accounts[0].address);
    for (let i = 0; i < skAccounts.length; i++) {
        txsToSend.push(await generateRegisterSessionKeyTx(aspect, accounts[0], eoaNonce++, skAccounts[i], contract, contractCallMethod, expireBlockHeight));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSRegisterSK, registerSK);
    await checkSentTransactionHashesLength();
    console.log(registerSK, "done")

    // send session key tx
    const sendSK = "[send session key tx]";
    console.log(sendSK, skAccountNum)
    txsToSend = [];
    eoaNonce = await web3.eth.getTransactionCount(accounts[0].address);
    for (let i = 0; i < skAccounts.length; i++) {
        txsToSend.push(await generateSessionKeyTx(skAccounts[i], accounts[0], eoaNonce++, contract, contractCallData, false));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSSendSK, sendSK);
    await checkSentTransactionHashesLength();
    console.log(sendSK, "done");
}

async function oneEoAWithOneSessionKey() {
    let nonce = await web3.eth.getTransactionCount(mainAccount.address);

    let contract = await deployContract(nonce++);
    let aspect = await deployAspect(nonce++);

    await bindAspect(aspect, contract, nonce++);

    const eoaAccountNum = 1;
    const skAccountNum = 1;

    // generate EoA accounts
    const generateEOA = "[generate EoA accounts]";
    console.log(generateEOA, eoaAccountNum);
    let accounts = await generateAccounts(eoaAccountNum, "0.01", nonce, generateEOA);
    await checkSentTransactionHashesLength();
    console.log(generateEOA, "done");

    // bind EoA with Aspect
    const bindEOAAspect = "[bind EoA with Aspect]";
    console.log(bindEOAAspect, eoaAccountNum);
    let txsToSend = [];
    for (let i = 0; i < accounts.length; i++) {
        txsToSend.push(await generateBindEoATx(aspect, accounts[i]));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSBindEOAAspect, bindEOAAspect);
    await checkSentTransactionHashesLength();
    console.log(bindEOAAspect, "done");

    // generate session key accounts
    const generateSK = "[generate session key accounts]";
    console.log(generateSK, skAccountNum)
    nonce = await web3.eth.getTransactionCount(mainAccount.address);
    let skAccounts = await generateAccounts(skAccountNum, 0, nonce, generateSK);
    await checkSentTransactionHashesLength();
    console.log(generateSK, "done");

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    let currentBlockHeight = await web3.eth.getBlockNumber();
    let expireBlockHeight = currentBlockHeight + 10000000;

    // register session key
    const registerSK = "[register session key]"
    console.log(registerSK, skAccountNum)
    txsToSend = [];
    let eoaNonce = await web3.eth.getTransactionCount(accounts[0].address);
    for (let i = 0; i < skAccounts.length; i++) {
        txsToSend.push(await generateRegisterSessionKeyTx(aspect, accounts[0], eoaNonce++, skAccounts[i], contract, contractCallMethod, expireBlockHeight));
    }
    await sendTransactionsAtFixedRate(txsToSend, TPSRegisterSK, registerSK);
    await checkSentTransactionHashesLength();
    console.log(registerSK, "done");

    // send session key tx
    const sendSK = "[send session key tx]";
    console.log(sendSK, skAccountNum);
    let i = 0;
    while (i++ < 1) {
        txsToSend = [];
        eoaNonce = await web3.eth.getTransactionCount(accounts[0].address);
        for (let i = 0; i < 100; i++) {
            txsToSend.push(await generateSessionKeyTx(skAccounts[0], accounts[0], eoaNonce++, contract, contractCallData, false));
        }
        await sendTransactionsAtFixedRate(txsToSend, TPSSendSK, sendSK);
    }
    await checkSentTransactionHashesLength();
    console.log(sendSK, "done")
}

// TODO 拉块消hash


async function generateAccounts(numAccounts, initialFund, nonce, testName) {
    let accounts = [];
    let fundingTxs = [];
    for (let i = 0; i < numAccounts; i++) {
        let account = web3.eth.accounts.create();
        if (initialFund) {
            const tx = {
                from: mainAccount.address,
                to: account.address,
                value: web3.utils.toWei(initialFund, "ether"),
                gas: 21000,
                gasPrice: gasPrice,
                nonce: nonce++
            };
            const signed = await web3.eth.accounts.signTransaction(tx, mainAccount.privateKey);
            const txWithExpect = { raw: signed.rawTransaction, tx: tx, hash: signed.transactionHash };
            fundingTxs.push(txWithExpect);
        }
        accounts.push(account);
    }
    if (fundingTxs.length > 0) {
        await sendTransactionsAtFixedRate(fundingTxs, TPSGenerateEOA, testName);
    }
    return accounts;
}

async function sendTransactionsAtFixedRate(txs, tps, testName) {
    const interval = 1000 / tps;
    if (!testName) {
        testName = "[send transaction]"
    }

    for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        addSentTransactionHash(tx.hash);
        web3.eth.sendSignedTransaction(tx.raw);
        console.log(testName, "send success", i, tx.hash);
        await new Promise(r => setTimeout(r, interval));
    }
}

async function generateSessionKeyTx(sKeyAccount, eoa, eoaNonce, contract, callData, fail) {
    let tx = {
        from: sKeyAccount.address,
        nonce: eoaNonce,
        gasPrice,
        gas: 40000000,
        data: callData,
        to: contract.options.address,
        chainId
    };
    let signedTx = await web3.eth.accounts.signTransaction(tx, sKeyAccount.privateKey);
    let validationData = "0x"
        + rmPrefix(eoa.address)
        + padStart(rmPrefix(signedTx.r), 64, "0")
        + padStart(rmPrefix(signedTx.s), 64, "0")
        + rmPrefix(getOriginalV(signedTx.v, chainId));
    let encodedData = web3.eth.abi.encodeParameters(['bytes', 'bytes'],
        [validationData, callData]);
    encodedData = '0xCAFECAFE' + web3.utils.keccak256(encodedData).slice(2, 10) + encodedData.slice(2);
    const skTx = {
        nonce: numberToHex(eoaNonce),
        gasPrice: numberToHex(gasPrice),
        gas: numberToHex(40000000),
        data: encodedData,
        to: contract.options.address,
        chainId: numberToHex(chainId)
    }

    const serializedSkTx = new EthereumTx(skTx).serialize();
    const skHash = web3.utils.keccak256(serializedSkTx).toString('hex');

    const raw = '0x' + serializedSkTx.toString('hex');

    return {
        raw: raw,
        tx: tx,
        shouldFail: fail,
        hash: skHash
    };
}

async function generateRegisterSessionKeyTx(aspect, eoa, eoaNonce, sKeyAccount, contract, contractCallMethod, expireBlockHeight) {
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
        from: eoa.address,
        nonce: eoaNonce,
        gasPrice,
        gas: 40000000,
        to: aspectCore.options.address,
        data: operationData,
        chainId
    }

    const signed = await web3.eth.accounts.signTransaction(tx, eoa.privateKey);

    return {
        raw: signed.rawTransaction,
        tx: tx,
        hash: signed.transactionHash
    };
}

async function generateBindEoATx(aspect, eoa) {
    const nonce = await web3.eth.getTransactionCount(eoa.address);
    const bindingData = aspectCore.methods.bind(aspect.options.address, 1, eoa.address, 1).encodeABI();
    const tx = {
        from: eoa.address,
        nonce: nonce,
        gasPrice,
        gas: 40000000,
        to: aspectCore.options.address,
        data: bindingData,
        chainId
    }

    const signed = await web3.eth.accounts.signTransaction(tx, eoa.privateKey);

    return {
        raw: signed.rawTransaction,
        tx: tx,
        hash: signed.transactionHash
    };
}

async function bindAspect(aspect, contract, nonce) {
    console.log("[bind aspect]", aspect.options.address, contract.options.address);
    const bindingData = contract.bind({
        priority: 1,
        aspectId: aspect.options.address,
        aspectVersion: 1,
    }).encodeABI();
    const tx = {
        from: mainAccount.address,
        nonce: nonce,
        gasPrice,
        gas: 40000000,
        to: aspectCore.options.address,
        data: bindingData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, mainAccount.privateKey);
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
    contract = await contract.deploy({ data: contractBin }).send({
        from: mainAccount.address,
        nonce: nonce,
        gasPrice,
        gas: 40000000,
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
        paymaster: mainAccount.address,
        proof: '0x0'
    }).encodeABI();
    const tx = {
        from: mainAccount.address,
        nonce: nonce,
        gasPrice,
        gas: 40000000,
        to: aspectCore.options.address,
        data: aspectDeployData,
        chainId
    }
    const signedTx = await web3.eth.accounts.signTransaction(tx, mainAccount.privateKey);
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
    fetchBlocks();

    console.log("test start");
    console.log("==== ⏳ multiEoAWithMultiSessionKey start ===");
    await multiEoAWithMultiSessionKey();
    console.log("==== ✅ multiEoAWithMultiSessionKey end ===");
    console.log("==== ⏳ oneEoAWithMultiSessionKey start ===");
    await oneEoAWithMultiSessionKey();
    console.log("==== ✅ oneEoAWithMultiSessionKey end ===");
    await oneEoAWithOneSessionKey();
    process.exit(0);
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
