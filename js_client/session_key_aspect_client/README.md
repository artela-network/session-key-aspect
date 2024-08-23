## Introduction

`SessionKeyAspectClient` is a JavaScript library for managing session keys on the Artela [Session-key Aspect](https://github.com/artela-network/session-key-aspect ). It provides a set of APIs to interact with Aspect for session key operations.



## Installation

```
npm install @artela/session-key-aspect-client
```



## Quick start

Import related lib on your node.js project.

```js
const SessionKeyAspectClient = require('session-key-aspect-client');
const Web3 = require('@artela/web3');
```

Init `SessionKeyAspectClient`

```js
// 1. init web3 client
const testnetRpc = "https://betanet-rpc1.artela.network"
const web3 = new Web3(testnetRpc);	

// 2. init session key client
const testAspectAddress = "0x06786bB59719d7DDD9D42457a16BbCD6953A7cab";
const aspectClient = new SessionKeyAspectClient(web3, testAspectAddress);

```

Register a session key and query it.

```js
// init your main key
const yourWalletPrivateKey = "0xCAFE....CAFE";
const account = web3.eth.accounts.privateKeyToAccount(yourWalletPrivateKey);

// register session key
const testSessionKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
const testMethods = ["0A0A0A0A", "0B0B0B0B"];
const testExpireBlockNumber = 2000;

let ret = await aspectClient.registerSessionKey(account, testSessionKeyAddress, testContract, testMethods, testExpireBlockNumber);
    console.log(ret);

// query this session key
let sessionKey = await aspectClient.getSessionKey(account.address, testSessionKeyAddress, testContract);
console.log(sessionKey)
```



## Usage

**Usage 1.** Use `registerSessionKey` to sign and send the session key.

**Usage 2.** Use `registerSessionKeyUnsignTx` to construct an unsigned transaction and then sign and send it by your web3 client.

**Usage 3.** Use `registerSessionKeyByMetamask` to require Metamask to sign and send the register transaction.



## API Reference

### 1. `registerSessionKey`

Registers a new session key.

- **Parameters**:

  - `account` - object: The web3.js account object. Learn more: [web3.eth.accounts](https://web3js.readthedocs.io/en/v1.10.0/web3-eth-accounts.html#privatekeytoaccount)
  - `sessionKeyAddress` - string: The session key address. 
  - `bindingContractAddress` - string: The contract address to bind.
  - `bindingMethodSigSet` - string[]: An array of method signatures.
  - `expireBlockNumber` - number: The number of blocks until expiration (default 1000).

- **Returns**: An object containing the success status and transaction receipt.

  - `success` - boolean: true | false

  - `receipt` - object: a web3.js receipt object. Learn more: [receipt](https://web3js.readthedocs.io/en/v1.10.0/web3-eth.html?highlight=receipt#gettransactionreceipt)

- **Example**:

  ```js
  // init your main key
  const yourWalletPrivateKey = "0xCAFE....CAFE";
  const account = web3.eth.accounts.privateKeyToAccount(yourWalletPrivateKey);
  
  // register session key
  const testSessionKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
  const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
  const testMethods = ["0A0A0A0A", "0B0B0B0B"];
  const testExpireBlockNumber = 2000;
  
  let ret = await aspectClient.registerSessionKey(account, testSessionKeyAddress, testContract, testMethods, testExpireBlockNumber);
  ```

### 2. `registerSessionKeyByMetamask`

Registers a session key through MetaMask. Call this method will ask for Metamask signatrure.

- **Parameters**: 

  - `accountAddress` - string: The address of the account.
  - `sessionKeyAddress` - string: The session key address. 
  - `bindingContractAddress` - string: The contract address to bind.
  - `bindingMethodSigSet` - string[]: An array of method signatures.
  - `expireBlockNumber` - number: The number of blocks until expiration (default 1000).

- **Returns**: Transaction hash.
- **Example**:

  ```js
  // init client
  const web3 = new Web3(window.ethereum);
  const testAspectAddress = "0x06786bB59719d7DDD9D42457a16BbCD6953A7cab";
  let aspectClient = new SessionKeyAspectClient(web3, aspectAddress);
  
  
  await window.ethereum.enable();
  
  // call api
  const walletAddress = await window.ethereum.request({ method: 'eth_requestAccounts' });
  
  const testSessionKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
  const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
  const testMethods = ["0A0A0A0A", "0B0B0B0B"];
  const testExpireBlockNumber = 2000;
  
  await aspectClient.registerSessionKeyByMetamask(walletAddress, testSessionKeyAddress, testContract, testMethods, testExpireBlockNumber);
  
  ```

  

### 3. `registerSessionKeyUnsignTx`

Generates an unsigned transaction for registering a session key. Then, the caller signs and sends the transaction by themself.

- **Parameters**: Similar to `registerSessionKeyByMetamask`.
- **Returns**: Unsigned transaction object.

  - `from`  - string: main key address
  - `to`  - string: Aspect system contract address
  - `gas` - number: gas of this tx
  - `data`  - string: call data of register session key

- **Example**:

  ```js
  
  // get unsign tx
  let unsignTx = await aspectClient.registerSessionKeyUnsignTx(account.address, testSessionKeyAddress, testContract, testMethods, 20);
  console.log(unsignTx);
  
  // sign and send it
  let signedTx = await web3.eth.accounts.signTransaction(unsignTx, account.privateKey);
  let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log(receipt);
  
  // query from blockchain
  sessionKey = await aspectClient.getSessionKey(account.address, testSessionKeyAddress, testContract);
  console.log(sessionKey);
  ```

  

### 4. `getSessionKey`

Retrieves the session key.

- **Parameters**:
  - `walletAddress` - string: The wallet address. E.g. `0xCAFE...CAFE`
  - `sessionKeyAddress` - string: The session key address. E.g. `0xCAFE...CAFE`
  - `bindingContractAddress` - string: The contract address. E.g. `0xCAFE...CAFE`
- **Returns**:  Session key object.

  - `walletAddress` - string: the main key
  - `sessionKeyAddress` - string: the session key
  - `bindingContractAddress` - string: the binding contract of this session key
  - `bindingMethodSet` - string[]:  the binding contract method set of this session key
  - `expireBlockHeight` - number: the expire block height of this session key

- **Example:**

  ```js
  // register session key
  const testMainKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
  const testSessionKeyAddress = "0x0250032b4a11478969dc4caaa11ecc2ea98cfc12";
  const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
  
  // query this session key
  let sessionKey = await aspectClient.getSessionKey(testMainKeyAddress, testSessionKeyAddress, testContract);
  console.log(sessionKey)
  ```

  

### 5. `getSessioinKeyExpireHeight`

Retrieves the expiration height of the session key.

- **Parameters**: Similar to `getSessionKey`.

- **Returns**: Number; The block height at which the session key expires.

  

### 6. `getAllSessionKey`

Retrieves all session keys of specific EoA

- **Parameters**: 
  - `walletAddress` - string: The EoA address. E.g. `0xCAFE...CAFE`
- **Returns**: Session key object array. The object struct is similar to `getSessionKey`.



### 7. `bindEoA`

Bind EoA to the aspect.

- **Parameters**: 

  - `account` - object: The web3.js account object of EoA. Learn more: [web3.eth.accounts](https://web3js.readthedocs.io/en/v1.10.0/web3-eth-accounts.html#privatekeytoaccount)

- **Returns**: An object containing the success status and transaction receipt.

  - `success` - boolean: true | false

  - `receipt` - object: a web3.js receipt object. Learn more: [receipt](https://web3js.readthedocs.io/en/v1.10.0/web3-eth.html?highlight=receipt#gettransactionreceipt)

- **Example**:

  ```js
  // init your main key
  const yourWalletPrivateKey = "0xCAFE....CAFE";
  const account = web3.eth.accounts.privateKeyToAccount(yourWalletPrivateKey);
  
  let ret = await aspectClient.bindEoA(account);
  ```

### 

### 8. `unbindEoAByMetamask`

Bind EoA to the Aspect through MetaMask. Call this method will ask for Metamask signatrure.

- **Parameters**: 
  - `accountAddress` - string: The address of the EoA.
- **Returns**: Transaction hash.



### 9. `unbindEoA`

Undind EoA from the Aspect.

- **Parameters**: 

  - `account` - object: The web3.js account object of EoA. Learn more: [web3.eth.accounts](https://web3js.readthedocs.io/en/v1.10.0/web3-eth-accounts.html#privatekeytoaccount)

- **Returns**: An object containing the success status and transaction receipt.

  - `success` - boolean: true | false

  - `receipt` - object: a web3.js receipt object. Learn more: [receipt](https://web3js.readthedocs.io/en/v1.10.0/web3-eth.html?highlight=receipt#gettransactionreceipt)

- **Example**:

  ```js
  // init your main key
  const yourWalletPrivateKey = "0xCAFE....CAFE";
  const account = web3.eth.accounts.privateKeyToAccount(yourWalletPrivateKey);
  
  let ret = await aspectClient.unbindEoA(account);
  ```

### 

### 10. `unbindEoAByMetamask`

Unbind EoA from the Aspect through MetaMask. Call this method will ask for Metamask signatrure.

- **Parameters**: 
  - `accountAddress`  - string: The address of the EoA.
- **Returns**: String; Transaction hash.



### 11. `bindContract`

Bind a smart contract to the Aspect.

- **Parameters**: 

  - `account` - object: The owner of the smart contract. It's a web3.js account object of EoA. Learn more: [web3.eth.accounts](https://web3js.readthedocs.io/en/v1.10.0/web3-eth-accounts.html#privatekeytoaccount)
  - `contractAddress` - string: The smart contract address.

- **Returns**: An object containing the success status and transaction receipt.

  - `success` - boolean: true | false

  - `receipt` - object: a web3.js receipt object. Learn more: [receipt](https://web3js.readthedocs.io/en/v1.10.0/web3-eth.html?highlight=receipt#gettransactionreceipt)

- **Example**:

  ```js
  // init your main key
  const yourWalletPrivateKey = "0xCAFE....CAFE";
  const account = web3.eth.accounts.privateKeyToAccount(yourWalletPrivateKey);
  
  let ret = await aspectClient.bindContract(account);
  ```

### 

### 12. `bindContractByMetamask`

Bind a smart contract to the Aspect through MetaMask. Call this method will ask for Metamask signatrure.

- **Parameters**: 
  - `accountAddress` - string: The owner of the smart contract. 
  - `contractAddress` - string: The smart contract address.
- **Returns**: Transaction hash.

- **Example**:

  ```js
  // init your main key
  const eoaAddress = "0xCAFE....CAFE";
  const smartContractAddress = "0xCAFE....CAFE";
  
  let ret = await aspectClient.bindContract(eoaAddress, smartContractAddress);
  ```



### 13. `ifBinding`

Query if is a EoA or smart contract bound to the Aspect.

- **Parameters**:
  - `address` - string: The address of EoA or smart contract. E.g. `0xCAFE...CAFE`
- **Returns**:  Bool



### 14. `getBindingAccount`

Query all address binding to this Aspect.

- **Returns**:  String array of address

