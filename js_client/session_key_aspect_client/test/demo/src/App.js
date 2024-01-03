import React, { useState, useEffect } from 'react';
import Web3 from '@artela/web3';
import { LegacyTransaction as EthereumTx } from '@ethereumjs/tx'
import BigNumber from 'bignumber.js';
import { ConnectButton } from '@rainbow-me/rainbowkit';

import './App.css';


const SessionKeyAspectClient = require('sessioin-key-aspect-client');

const App = () => {

  const testContract = "0x6D33Ba9cDfc695f498c0C78990125dbF9C55c70f";
  const testContractAbi = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [{ "internalType": "uint256", "name": "number", "type": "uint256" }], "name": "add", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "get", "outputs": [{ "internalType": "uint256", "name": "result", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "isOwner", "outputs": [{ "internalType": "bool", "name": "result", "type": "bool" }], "stateMutability": "view", "type": "function" }];
  const testMethods = "0x1003e2d2";
  const testAspectAddress = "0xcFed98CC44654188539B356AB8257380f914E118";

  const [aspectAddress, setAspectAddress] = useState(testAspectAddress);

  const [walletAddress, setWalletAddress] = useState('');
  const [counter, setCounter] = useState('-');
  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(false);
  const [isAddButton2Disabled, setIsAddButton2Disabled] = useState(false);

  // unbind > empty > active > expired
  const [sessionKeyStatus, setSessionKeyStatus] = useState("unbind");
  const [expiredHeight, setExpiredHeight] = useState("-");

  const metamask = new Web3(window.ethereum);
  const web3Artela = new Web3("https://testnet-rpc1.artela.network");
  let aspectClient = new SessionKeyAspectClient(metamask, aspectAddress);
  let aspectClientArtela = new SessionKeyAspectClient(web3Artela, aspectAddress);

  const contract = new metamask.eth.Contract(testContractAbi, testContract);

  useEffect(() => {

    aspectClient = new SessionKeyAspectClient(metamask, aspectAddress);
    aspectClientArtela = new SessionKeyAspectClient(web3Artela, aspectAddress);

    syncUp();
    syncSKeyStatus();
  }, [counter, walletAddress, isAddButtonDisabled, expiredHeight]);

  const syncUp = async () => {
    let ret = await web3Artela.eth.call({
      data: contract.methods.get().encodeABI(),
      to: contract.options.address,
    })

    let data = web3Artela.eth.abi.decodeParameter('uint256', ret);

    setCounter(data);
  };

  // sessionKeyStatus
  // unbind > empty > active > expired
  const syncSKeyStatus = async () => {
    let isBinding = await aspectClient.ifBinding(walletAddress);

    if (!isBinding) {
      setSessionKeyStatus("unbind")
      return;
    }

    const storeKey = loadFromLocalStorage(walletAddress);
    if (!storeKey) {
      setSessionKeyStatus("empty")
      return;
    }

    let sKeyAccount = web3Artela.eth.accounts.privateKeyToAccount(storeKey);
    let height = await aspectClient.getSessioinKeyExpireHeight(walletAddress, sKeyAccount.address, testContract);

    setExpiredHeight(height.toString());

    if (height < await web3Artela.eth.getBlockNumber()) {
      setSessionKeyStatus("expired")
      return;
    } else {
      setSessionKeyStatus("active")
      return;
    }
  };

  const saveToLocalStorage = (wallet, input) => {
    localStorage.setItem('session_key_for_counter_contract' + wallet, input);
  };

  const loadFromLocalStorage = (wallet) => {
    const storedData = localStorage.getItem('session_key_for_counter_contract' + wallet);
    return storedData;
  };

  const handleAdd = async () => {

    if (undefined == walletAddress || "" == walletAddress) {
      await configYourMetamask();
      return;
    }

    setIsAddButtonDisabled(true);

    let contractCallData = contract.methods.add([1]).encodeABI();
    let gas = 4000000;
    let metamaskTx = {
      from: walletAddress,
      to: testContract,
      value: "0x00",
      gas: "0x" + gas.toString(16),
      data: contractCallData
    }

    console.log("metamaskTx:", metamaskTx);
    let txHash = "";
    let txError = false;
    metamask.eth.sendTransaction(metamaskTx, function (error, hash) {
      console.log(txHash);
    }).on('transactionHash', function (hash) {
      txHash = hash;
    }).on('error', function () { txError = true });

    while ("" == txHash && !txError) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("txHash:" + txHash);
    }

    if (txError) {
      setIsAddButtonDisabled(false);
      return;
    }

    let txReceipt = false;
    while (!txReceipt) {
      let tx = await web3Artela.eth.getTransaction(txHash)

      console.log("tx:" + tx);
      if (tx != null) {
        txReceipt = true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await syncUp();

    setIsAddButtonDisabled(false);
  };

  const configYourMetamask = async () => {
    let ethereum = window.ethereum
    if (!ethereum) {
      alert("this demo require metamask");
      return;
    }

    const networkParams = {
      chainId: '0x2E2C',  // 十六进制链ID
      chainName: 'Artela',
      rpcUrls: ['https://testnet-rpc1.artela.network/'],
      nativeCurrency: {
        name: 'Artela',
        symbol: 'ART',  // 最多 5 个字符
        decimals: 18,
      },
      blockExplorerUrls: ['https://testnet-scan.artela.network/'],
    };

    try {
      // 尝试切换到指定网络
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkParams.chainId }],
      });
    } catch (switchError) {
      // 如果指定网络未添加，则尝试添加
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
      console.error(switchError);
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        console.error('No accounts found');
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  }

  const handleAddWithSessionKey = async () => {
    if (undefined == walletAddress || "" == walletAddress) {
      await configYourMetamask();
      return;
    }

    setIsAddButton2Disabled(true);
    await handleAddWithSessionKey_();
    setIsAddButton2Disabled(false);
  }

  const handleAddWithSessionKey_ = async () => {

    let sessionKeyStatus_ = sessionKeyStatus;
    console.log("sessionKeyStatus_:" + sessionKeyStatus_);
    if (sessionKeyStatus_ == "unbind") {
      const result = window.confirm('Your EoA need to bind Aspect to enable session key!');
      if (!result) {
        return;
      }

      await aspectClient.bindEoAByMetamask(walletAddress);

      sessionKeyStatus_ = "empty";
      setSessionKeyStatus(sessionKeyStatus_)
    }

    console.log("sessionKeyStatus_:" + sessionKeyStatus_);
    if (sessionKeyStatus_ == "empty" || sessionKeyStatus_ == "expired") {
      const result = window.confirm('Create session key for your EoA!');
      if (!result) {
        return;
      }

      let sKeyPrivKey = web3Artela.eth.accounts.create(web3Artela.utils.randomHex(32)).privateKey;
      let sKeyAccount = web3Artela.eth.accounts.privateKeyToAccount(sKeyPrivKey);
      console.log("create session key: ", sKeyAccount.address);
      await aspectClient.registerSessionKeyByMetamask(walletAddress, sKeyAccount.address, testContract, [testMethods], 48 * 60 * 60);

      saveToLocalStorage(walletAddress, sKeyPrivKey);

      sessionKeyStatus_ = "active";
      setSessionKeyStatus(sessionKeyStatus_)
    }

    console.log("sessionKeyStatus_:" + sessionKeyStatus_);
    let contractCallData = contract.methods.add([1]).encodeABI();
    let sKeyPrivKey = loadFromLocalStorage(walletAddress);
    let sKeyAccount = web3Artela.eth.accounts.privateKeyToAccount(sKeyPrivKey);

    console.log("session key: ", sKeyAccount.address);

    let gasPrice = await web3Artela.eth.getGasPrice();
    let nonce = await web3Artela.eth.getTransactionCount(walletAddress);
    let chainId = await web3Artela.eth.getChainId();

    let gas = 8000000;
    let gasLimit = 20000000;

    let tx = {
      from: sKeyAccount.address,
      nonce: nonce,
      gasPrice,
      gas: 8000000,
      data: contractCallData,
      to: contract.options.address,
      chainId,
      gasLimit: gasLimit
    }

    let signedTx = await web3Artela.eth.accounts.signTransaction(tx, sKeyPrivKey);
    console.log("sign tx : ", signedTx);

    let validationData = "0x"
      + walletAddress.slice(2)
      + padStart(rmPrefix(signedTx.r), 64, "0")
      + padStart(rmPrefix(signedTx.s), 64, "0")
      + rmPrefix(getOriginalV(signedTx.v, chainId));

    let encodedData = web3Artela.eth.abi.encodeParameters(['bytes', 'bytes'],
      [validationData, contractCallData]);

    // new calldata: magic prefix + checksum(encodedData) + encodedData(validation data + raw calldata)
    // 0xCAFECAFE is a magic prefix, 
    encodedData = '0xCAFECAFE' + web3Artela.utils.keccak256(encodedData).slice(2, 10) + encodedData.slice(2);

    tx = {
      from: walletAddress,
      nonce: toPaddedHexString(nonce),
      gasPrice: toPaddedHexString(gasPrice),
      gas: toPaddedHexString(gas),
      data: encodedData,
      to: contract.options.address,
      chainId: toPaddedHexString(chainId),
      gasLimit: toPaddedHexString(gasLimit),
    }

    console.log("tx, ", tx);

    let rawTx = '0x' + bytesToHex(EthereumTx.fromTxData(tx).serialize());
    let receipt = await web3Artela.eth.sendSignedTransaction(rawTx);
    console.log(`call contract with session key result: `);
    console.log(receipt);

    syncUp();
    syncSKeyStatus();
  };

  function toPaddedHexString(num) {
    let hex = num.toString(16);

    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }

    return '0x' + hex;
  }

  function getOriginalV(hexV, chainId_) {
    const v = new BigNumber(hexV, 16);
    const chainId = new BigNumber(chainId_);
    const chainIdMul = chainId.multipliedBy(2);

    const originalV = v.minus(chainIdMul).minus(8);

    const originalVHex = originalV.toString(16);

    return originalVHex;
  }

  function rmPrefix(data) {
    if (data.startsWith('0x')) {
      return data.substring(2, data.length);
    } else {
      return data;
    }
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

  function bytesToHex(bytes) {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  }

  return (
    <div>
      <div className='container'>
        <div className="center-container">
          <p className="title-h1">Introduction</p>
          <span>This is Counter contract integrated with session key Aspect.</span>
          <span>When calling it using EoA, wallet interaction is required.</span>
          <span>But with session keys, it doesn't require any interaction.</span>
          <p className="title">Before Testing</p>
          <button className={`register-button ${"" != walletAddress ? 'disabled' : ''}`} onClick={configYourMetamask}>Connect your Metamask</button>
          <p className="title"></p>
        </div>
      </div>

      <div className='container'>
        <div className="center-container">
          <p className="title-h1">Counter Contract</p>
          <p className="title">count: {counter}</p>

          <p className="title">call contract by EoA</p>
          <button className={`register-button ${isAddButtonDisabled ? 'disabled' : ''}`} onClick={handleAdd} disabled={isAddButtonDisabled}>{isAddButtonDisabled ? 'Tx pending...' : 'Add'}</button>

          <p className="title">call contract by session key</p>
          <button className={`register-button ${isAddButton2Disabled ? 'disabled' : ''}`} onClick={handleAddWithSessionKey} disabled={isAddButton2Disabled}>{isAddButton2Disabled ? 'Processing...' : 'Add'}</button>
          <p className="">seseion key status: {sessionKeyStatus}</p>
          <p className="">seseion key will expired at block#{expiredHeight}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
