const SessionKeyAspectClient = require('../index');

const Web3 = require('@artela/web3');
const fs = require("fs");

// ******************************************
// init web3 and private key
// ******************************************
// const testnetRpc = "https://testnet-rpc1.artela.network"
const testnetRpc = "http://47.254.2.74:8545"
const web3 = new Web3(testnetRpc);

let sk = fs.readFileSync("./test/privateKey.txt", 'utf-8');
const account = web3.eth.accounts.privateKeyToAccount(sk.trim());
web3.eth.accounts.wallet.add(account.privateKey);

const testAspectAddress = "0xA9d50e86c6CD9c88f58751b3eB8653da0C723D10";
const testSessionKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
const testMethods = ["0A0A0A0A", "0B0B0B0B"];

async function f() {

    // usage 1
    console.log("// usage 1")
    const aspectClient = new SessionKeyAspectClient(web3, testAspectAddress);
    let ret = await aspectClient.registerSessionKey(account, testSessionKeyAddress, testContract, testMethods, 20);
    console.log(ret);

    let sessionKey = await aspectClient.getSessionKey(account.address, testSessionKeyAddress, testContract);
    console.log(sessionKey)
    let expireHeight = await aspectClient.getSessioinKeyExpireHeight(account.address, testSessionKeyAddress, testContract);
    console.log(expireHeight)

    // usage 2
    console.log("// usage 2")
    let unsignTx = await aspectClient.registerSessionKeyUnsignTx(account.address, testSessionKeyAddress, testContract, testMethods, 20);
    console.log(unsignTx);

    let signedTx = await web3.eth.accounts.signTransaction(unsignTx, account.privateKey);
    let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log(receipt);

    sessionKey = await aspectClient.getSessionKey(account.address, testSessionKeyAddress, testContract);
    console.log(sessionKey)

    // query all key
    let sessionKeys = await aspectClient.getAllSessionKey(account.address);
    console.log("all sessionKeys", sessionKeys);

    // bind
    console.log("// binding address")
    ret = await aspectClient.bindEoA(account);
    console.log(ret);

    // query binding address list
    console.log("// query binding address")
    ret = await aspectClient.bindingAccount();
    console.log(ret);

    // unbind
    console.log("// unbinding address")
    ret = await aspectClient.unbindEoA(account);
    console.log(ret);

    // query binding address list
    console.log("// query binding address")
    ret = await aspectClient.bindingContract();
    console.log(ret);
}

f().then();