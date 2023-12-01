

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



