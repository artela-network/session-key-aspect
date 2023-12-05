"use strict"

//todo modify it

const Web3 = require('@artela/web3');
const fs = require("fs");
const { numberToHex } = require("@artela/web3-utils");
const BigNumber = require('bignumber.js');

const contractBin = fs.readFileSync('./build/contract/Counter.bin', "utf-8");
const abi = fs.readFileSync('./build/contract/Counter.abi', "utf-8")
const contractABI = JSON.parse(abi);
const EthereumTx = require('ethereumjs-tx').Transaction;

const demoContractOptions = {
    data: contractBin
};
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

async function f() {
    console.log('start running demo');

    // ******************************************
    // init web3 and private key
    // ******************************************
    const configJson = JSON.parse(fs.readFileSync('./project.config.json', "utf-8").toString());
    const web3 = new Web3(configJson.node);

    let sk = fs.readFileSync("privateKey.txt", 'utf-8');
    const account = web3.eth.accounts.privateKeyToAccount(sk.trim());
    web3.eth.accounts.wallet.add(account.privateKey);

    let gasPrice = await web3.eth.getGasPrice();
    let chainId = await web3.eth.getChainId();
    let nonce = await web3.eth.getTransactionCount(account.address);
    let aspectCore = web3.atl.aspectCore();

    // ******************************************
    // prepare 1. deploy contract
    // ******************************************

    let contract = new web3.eth.Contract(contractABI);
    let deployData = contract.deploy(demoContractOptions).encodeABI();
    let tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 4000000,
        data: deployData,
        chainId
    }

    let signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log("signed contract deploy tx : \n", signedTx);

    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    contract.options.address = receipt.contractAddress;
    console.log('contract address is: ', contract.options.address);

    // ******************************************
    // prepare 2. deploy aspect
    // ******************************************

    // load aspect code and deploy
    let aspectCode = fs.readFileSync('./build/release.wasm', {
        encoding: "hex"
    });

    // instantiate an instance of aspect
    let aspect = new web3.atl.Aspect();
    let aspectDeployData = aspect.deploy({
        data: '0x' + aspectCode,
        properties: [],
        paymaster: account.address,
        proof: '0x0'
    }).encodeABI();

    tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 4000000,
        to: aspectCore.options.address,
        data: aspectDeployData,
        chainId
    }

    console.log('signed Aspect deploy Tx');
    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    console.log('send Aspect deploy Tx');
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    aspect.options.address = receipt.aspectAddress;
    console.log('aspect address is: ', aspect.options.address);

    // ******************************************
    // prepare 3. binding contract to aspect
    // ******************************************

    // binding with smart contract
    let contractBindingData = await contract.bind({
        priority: 1,
        aspectId: aspect.options.address,
        aspectVersion: 1,
    }).encodeABI();

    tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 4000000,
        data: contractBindingData,
        to: aspectCore.options.address,
        chainId
    }

    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`binding contract result:`);
    console.log(receipt);

    // ******************************************
    // start testing session keys
    // ******************************************

    // ******************************************
    // step 1. binding EoA to aspect
    // ******************************************

    // binding with EoA
    let eoaBindingData = await aspectCore.methods.bind(aspect.options.address, 1, account.address, 1).encodeABI();

    tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 4000000,
        data: eoaBindingData,
        to: aspectCore.options.address,
        chainId
    }

    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`binding EoA result:`);
    console.log(receipt);

    // ******************************************
    // step 1. register session key
    // ******************************************

    // create session keys
    let sKeyPrivKey = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey);
    let sKeyPrivKey2 = web3.eth.accounts.create(web3.utils.randomHex(32)).privateKey;
    let sKeyAccount2 = web3.eth.accounts.privateKeyToAccount(sKeyPrivKey2);

    let mainKey = rmPrefix(account.address);
    let sKey = rmPrefix(sKeyAccount.address);
    let sKeyContract = rmPrefix(contract.options.address);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let contractCallMethod = rmPrefix(contractCallData).substring(0, 8);

    console.log("\n\n" +
        "// ******************************************\n" +
        "// test registerSessionKey    \n" +
        "// ******************************************\n\n");

    // let op = "0x0001" + sKey + sKeyContract + "0001" + contractCallMethod;
    let op = "0x0001" + sKey + sKeyContract + "0003" + contractCallMethod + "d0e30db0" + "2e1a7d4d";
    let sessionKeyRegData = aspect.operation(op).encodeABI();
    console.log("op: ", op);
    console.log("calldata: ", sessionKeyRegData);

    tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 8000000,
        data: sessionKeyRegData,
        to: aspectCore.options.address,
        chainId
    }
    //0x0001 e2f8857467b61f2e4b1a614a0d560cd75c0c076f0250032b4a11478969dc4caaa11ecc2ea98cfc1200020A0A0A0A0B0B0B0B

    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('register session key result: ');
    console.log(receipt)

    // ******************************************
    // test getSessionKey: success
    // ******************************************
    console.log("\n\n" +
        "// ******************************************\n" +
        "// test getSessionKey: success    \n" +
        "// ******************************************\n\n");

    let queryKey = web3.utils.keccak256("0x" + sKeyContract + mainKey + sKey);
    op = "0x1001" + rmPrefix(queryKey);
    sessionKeyRegData = aspect.operation(op).encodeABI();

    console.log("op: ", op);
    console.log("calldata: ", sessionKeyRegData);

    let ret = await web3.eth.call({
        to: aspectCore.options.address,
        data: sessionKeyRegData
    });
    console.log("ret ", ret);
    console.log("ret ", web3.eth.abi.decodeParameter('string', ret));

    // ******************************************
    // test sign by main key: success
    // ******************************************
    console.log("\n\n" +
        "// ******************************************\n" +
        "// test sign by main key: success    \n" +
        "// ******************************************\n\n");

    tx = {
        from: account.address,
        nonce: nonce++,
        gasPrice,
        gas: 8000000,
        data: contractCallData,
        to: contract.options.address,
        chainId
    }

    console.log(tx)

    signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(`call contract with session key result: `);
    console.log(receipt);

    // ******************************************
    // step 2. sign tx by session key
    // ******************************************

    // ******************************************
    // test sign by skey: success
    // ******************************************
    console.log("\n\n" +
        "// ******************************************\n" +
        "// test sign by skey: success    \n" +
        "// ******************************************\n\n");

    tx = {
        from: sKeyAccount.address,
        nonce: nonce++,
        gasPrice,
        gas: 8000000,
        data: contractCallData,
        to: contract.options.address,
        chainId
    }

    web3.eth.accounts.wallet.add(sKeyAccount.privateKey);
    signedTx = await web3.eth.accounts.signTransaction(tx, sKeyAccount.privateKey);
    console.log("sign tx : ", signedTx);
    // params encode rules:
    //     20 bytes: from
    //         eg. e2f8857467b61f2e4b1a614a0d560cd75c0c076f
    //     32 bytes: r
    //     32 bytes: s
    //     1 bytes: v
    let validationData = "0x" + mainKey + rmPrefix(signedTx.r) + rmPrefix(signedTx.s) + rmPrefix(getOriginalV(signedTx.v, chainId));

    console.log("validationData : ", validationData);
    console.log("contractCallData : ", contractCallData);
    let encodedData = web3.eth.abi.encodeParameters(['bytes', 'bytes'],
        [validationData, contractCallData]);

    // new calldata: magic prefix + checksum(encodedData) + encodedData(validation data + raw calldata)
    // 0xCAFECAFE is a magic prefix, 
    encodedData = '0xCAFECAFE' + web3.utils.keccak256(encodedData).slice(2, 10) + encodedData.slice(2);

    tx = {
        from: sKeyAccount.address,
        nonce: numberToHex(nonce - 1),
        gasPrice: numberToHex(gasPrice),
        gas: numberToHex(8000000),
        data: encodedData,
        to: contract.options.address,
        chainId: numberToHex(chainId)
    }

    let rawTx = '0x' + new EthereumTx(tx).serialize().toString('hex');

    receipt = await web3.eth.sendSignedTransaction(rawTx);
    console.log(`call contract with session key result: `);
    console.log(receipt);

    // ******************************************
    // test sign by skey: fail due to illegal skey
    // ******************************************
    console.log("\n\n" +
        "// ******************************************\n" +
        "// test sign by skey: fail due to illegal skey    \n" +
        "// ******************************************\n\n");

    tx = {
        from: sKeyAccount.address,
        nonce: nonce++,
        gasPrice,
        gas: 8000000,
        data: contractCallData,
        to: contract.options.address,
        chainId
    }

    web3.eth.accounts.wallet.add(sKeyAccount2.privateKey);
    signedTx = await web3.eth.accounts.signTransaction(tx, sKeyAccount2.privateKey);
    console.log("sign tx : ", signedTx);

    validationData = mainKey + rmPrefix(signedTx.r) + rmPrefix(signedTx.s) + rmPrefix(getOriginalV(signedTx.v, chainId));

    console.log("validationData : ", validationData);
    console.log("contractCallData : ", contractCallData);
    encodedData = web3.eth.abi.encodeParameters(['bytes', 'bytes'],
        ["0x" + validationData, contractCallData]);

    encodedData = web3.eth.abi.encodeParameters(['bytes', 'bytes'],
        ["0x" + validationData, contractCallData]);

    tx = {
        from: sKeyAccount.address,
        nonce: numberToHex(nonce - 1),
        gasPrice: numberToHex(gasPrice),
        gas: numberToHex(8000000),
        data: encodedData,
        to: contract.options.address,
        chainId: numberToHex(chainId)
    }

    rawTx = '0x' + new EthereumTx(tx).serialize().toString('hex');

    try {
        receipt = await web3.eth.sendSignedTransaction(rawTx);
        throw new Error('this case must be error.');
    } catch (error) {
        console.error(error);
        console.log(`call contract with session key result: fail`);
    }

    console.log(`all test cases pass`);
}

f().then();
