

## Brief Intro

This Aspect will recover the signer address from the transaction signature (r,s,v).

Then, it verifies whether the signer is the session key of the EoA; if so, it will return the EoA address to the base layer.

The base layer retrieves the address and sets it as the sender of this transaction.



## Project Layout

```bash
.
├── README.md
├── asconfig.json
├── assembly
│   ├── aspect                 <-- aspect code resides here
│   │   └── aspect.ts          <-- entry functions for the aspect
│   └── index.ts
├── test_contracts             <-- smart contracts for testing
├── tests             				 <-- test
├── scripts                    <-- utilitity scripts, including deploying, binding and etc.
│   ├── aspect-deploy.cjs
│   ├── bind.cjs
│   ├── contract-call.cjs
│   └── contract-deploy.cjs
...
```



## Quick start

It's a [node.js](https://nodejs.org/en) project, so install the dependency first.

```shell
npm install
```



Build the Aspect and the testing smart contract.

```shell
npm run build
```



Create a testing wallet.

```shell
npm run account:create
```

The private key will be put in the file `privateKey.txt`.

The wallet address will be printed in the console, copy and require testnet **$ART** by this [faucet guide](https://docs.artela.network/develop/resources/faucet).

> If you want to use your own test net wallet, you can create the file  `privateKey.txt` and paste your private key into it. The private key format is a hex string like this `0xabcd....abcd`.



Run the test!!

```shell
npm run test
```

The script will run the test in the folder `tests`; you can run the specific case like this command `node tests/test_tx. js`.



## Implements Intro

 * The function `verifyTx` implements the session key verification logic.
 * The function `operation` implements the session key management logic. EoA calls this function to register, update, and delete its session keys.



## Testnet Session-key Aspect Usage

#### **Session-key Aspect address (testnet)** 

lastest version: 0x40a908F327B22922983061E9E6a87e785d6401BB



#### **Requirement**

The smart contract needs to bind this Aspect to enable the session key feature for its users.

If a smart contract wants to bind any Aspect, it **MUST** implement the [isOwner(address) ](https://docs.artela.network/develop/core-concepts/binding#contract-ownership-verification) method. Only the owner wallet can sign the binding transaction for its smart contract.



#### **Bind Aspect**

There are two ways to bind Aspects:

* Use `Aspect-tool` console command
* Use `artela-web3.js` to call Aspect system contract



#### **Use Aspect-tool**

In this way, you can bind Aspect by console command.

Step 1: install [aspect-tool](https://docs.artela.network/develop/reference/aspect-tool/overview)

```shell
npm install @artela/aspect-tool -g
```

Step 2: init a empty project

```shell
mkdir empty-aspect && cd empty-aspect
aspect-tool init
npm install yargs
```

Step 3: use the script in this project

```shell
  npm run contract:bind -- --pkfile {smart-contract-owner-privateKey-path} --contract {smart-contract-address} --abi {smart-contract-abi-path} --aspectId '0x40a908F327B22922983061E9E6a87e785d6401BB' --gas '800000'
```

Learn more detailed steps in this [guide](https://docs.artela.network/develop/reference/aspect-tool/bind-aspect).



#### Use artela-web3.js

In this way, you need to write js script. Follow this [guide](https://docs.artela.network/develop/client/artela-web3.js#web3ethcontractbind) to bind your smart contract to Aspect by using `web3.js` in js.

Here are brief steps:

1. using your `contract address` and `abi` construct a contract object by `web3.eth.contract` 
2. using `web3.eth.contract.bind(options, callback)` to send tx to bind specific Aspect

Example:

```js
await contract.bind({
        priority: 1,             // <-- Priority of the aspect, int8 number, smaller number has higher priority. Aspect with higher priority will be executed first.
        aspectId: "0xABCD....ABCD", // <-- address of the aspect to bind with the contract, eg. 
        aspectVersion: 1,        // <-- Version of the aspect to bind with the contract
    }).send({ from: accounts[0], nonce, ...sendOptions });
```

Learn more detailed steps in this [guide](https://docs.artela.network/develop/client/artela-web3.js#web3ethcontractbind).





























