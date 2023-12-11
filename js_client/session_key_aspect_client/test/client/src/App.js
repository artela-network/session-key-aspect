import React, { useState, useEffect } from 'react';
import Web3 from '@artela/web3';
import './App.css';

const SessionKeyAspectClient = require('sessioin-key-aspect-client');

const App = () => {

  const [walletAddress, setWalletAddress] = useState('');

  const testContract = "0330032b4a11478969dc4caaa11ecc2ea98cfcFF";
  const testMethods = ["0A0A0A0A", "0B0B0B0B"];
  const testAspectAddress = "0x06786bB59719d7DDD9D42457a16BbCD6953A7cab";

  const web3 = new Web3(window.ethereum);
  const aspectClient = new SessionKeyAspectClient(web3, testAspectAddress);

  const [sessionKey, setSessionKey] = useState(generateRandomEthereumAddress());
  const [syncData, setSyncData] = useState({
    walletAddress: '',
    sessionKeyAddress: '',
    bindingContractAddress: '',
    bindingMethodSet: [],
    expireBlockHeight: ''
  });

  useEffect(() => {

    const getAccount = async () => {
      if (window.ethereum) {
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
      } else {
        console.error('MetaMask not available');
      }
    };

    getAccount();

    const syncUp = async () => {
      console.log("syncUp " + sessionKey);
      const data = await aspectClient.getSessionKey(walletAddress, sessionKey, testContract);

      setSyncData(data);
    };

    const intervalId = setInterval(() => {
      syncUp();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionKey, walletAddress]);

  function generateRandomEthereumAddress() {
    let address = '0x';
    const characters = '0123456789abcdef';
    for (let i = 0; i < 40; i++) {
      address += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return address;
  }

  const handleRegister = async () => {
    try {
      await window.ethereum.enable();

      await aspectClient.registerSessionKeyByMetamask(walletAddress, sessionKey, testContract, testMethods, 20);

    } catch (error) {
      console.error('registerSessionKeyByMetamask fail', error);
    }
  };

  return (
    <div className="center-container">
      <p className="title">Connected Wallet</p>
      <p>{walletAddress}</p>
      <p className="title">Random session key</p>
      <div className="input-container">
        <input
          type="text"
          value={sessionKey}
          onChange={(e) => {
            console.log("e.target.value", e.target.value);
            setSessionKey(e.target.value)
          }}
          className="session-key-input"
        />
      </div>
      <p className="title">Binding contract and methods</p>
      <p>{"0x" + testContract}</p>
      <p> {"[" + testMethods[0] + "," + testMethods[1] + "]"} </p>
      <div className="button-container">
        <button className="register-button" onClick={handleRegister}>register</button>
      </div>
      <p className="title">Query this session key from blockchain</p>
      <div className="info-box">
        <pre>{JSON.stringify(syncData, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
