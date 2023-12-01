

# Sample Aspect

## Instruction

This is a sample project of Artela Aspect. 

## Files

```bash
.
├── README.md
├── asconfig.json
├── assembly
│   ├── aspect                 <-- Your aspect code resides here
│   │   └── aspect.ts          <-- Entry functions for the aspect
│   └── index.ts
├── contracts                  <-- Place your smart contracts here
├── scripts                    <-- Utilitity scripts, including deploying, binding and etc.
│   ├── aspect-deploy.cjs
│   ├── bind.cjs
│   ├── contract-call.cjs
│   └── contract-deploy.cjs
...
```

## Commands


### 1.Create a account

```solidity
  npm run account:create  -- --pkfile {file_path}
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).


### 2. Build contract

```solidity
   npm run contract:build
```
> The compiled product is placed in the `build/contract` directory.


### 3. Deploy contract

```bash
  npm run contract:deploy -- --pkfile {privateKey-path} \                        
                           --abi ./build/contract/xxx.abi \                          
                           --bytecode ./build/contract/xxx.bin \     
                           --args [..] \                     
                           --gas 200000 
                           
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).
> * --abi : contract abi path.
> * --bytecode:  contract bytecode path.
> * --args : If your contract's constructor requires input parameters, use `--args '[1, "a"]'` (optional).
> * --gas : e.g., `200000` (optional,default value `7000000`) 


### 4. Build Aspect

```bash
   npm run aspect:build
```

> The compiled product is placed in the `build` directory.


### 5. Deploy Aspect

```bash
  npm run aspect:deploy -- --pkfile {privateKey-path} \                                                
                         --wasm ./build/release.wasm \
                         --gas 200000  
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).
> * --wasm : wasm path.
> * --gas : like `200000`,(optional,default value `7000000`).


### 6. Contract Bind Aspect

```bash
  npm run contract:bind -- --pkfile {privateKey-path} \                          
                         --contract {smart-contract-address} \
                         --abi ./build/contract/xxx.abi \                        
                         --aspectId {aspect-Id} \                          
                         --gas 200000 
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).
> * --abi : contract abi path.
> * --contract:  smart contract address.
> * --aspectId:  aspect id.
> * --gas : like `200000`,(optional,default value `7000000`).


### 7. Contract Call

```shell
  npm run contract:call -- --pkfile {privateKey-path}    \     
                         --contract {smart-contract-address}  \                         
                         --abi ./build/contract/xxx.abi   \                                    
                         --method {method-name}  \   
                         --args [..]
                         --gas 200000 
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).
> * --abi : contract abi path.
> * --contract:  smart contract address.
> * --method:  method name.
> * --args : If your contract's constructor requires input parameters, use `--args '[1, "a"]'` (optional).
> * --gas : like `200000`,(optional,default value `7000000`).


### 8. Send Transaction

```shell
  npm run contract:send -- --pkfile {privateKey-path}    \     
                         --contract {smart-contract-address}  \                         
                         --abi ./build/contract/xxx.abi   \                                    
                         --method {method-name}  \   
                         --args [..]
                         --gas 200000 
```
> * --pkfile : privateKey path for sender. (optional,default value `./privateKey.txt`).
> * --abi : contract abi path.
> * --contract:  smart contract address.
> * --method:  method name.
> * --args : If your contract's constructor requires input parameters, use `--args '[1, "a"]'` (optional).
> * --gas : like `200000`,(optional,default value `7000000`).

