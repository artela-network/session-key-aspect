import React, { useState, useEffect } from 'react';
import Web3 from '@artela/web3';
import './App.css';

const SessionKeyAspectClient = require('sessioin-key-aspect-client');

const App = () => {

  const testMethods = "0A0A0A0A,0B0B0B0B";
  const testAspectAddress = "0x06786bB59719d7DDD9D42457a16BbCD6953A7cab";

  const [aspectAddress, setAspectAddress] = useState(testAspectAddress);
  const [walletAddress, setWalletAddress] = useState('');
  const [sessionKey, setSessionKey] = useState(generateRandomEthereumAddress());
  const [contractAddress, setContractAddress] = useState(generateRandomEthereumAddress());
  const [methods, setMethods] = useState(testMethods);
  const [syncData, setSyncData] = useState({
    walletAddress: '',
    sessionKeyAddress: '',
    bindingContractAddress: '',
    bindingMethodSet: [],
    expireBlockHeight: ''
  });

  const [mainKeyQP, setMainKeyQP] = useState('');
  const [sessionKeyQP, setSessionKeyQP] = useState('');
  const [contractQP, setContractQP] = useState('');
  const [queryResultQP, setQueryResultQP] = useState({});
  const [queryBindingResult, setQueryBindingResult] = useState("-");
  const [contractC, setContractC] = useState("");
  const [queryBindingResultC, setQueryBindingResultC] = useState("-");
  const [allSessionKeys, setAllSessionKeys] = useState("[]");

  const web3 = new Web3(window.ethereum);
  let aspectClient = new SessionKeyAspectClient(web3, aspectAddress);

  useEffect(() => {
    aspectClient = new SessionKeyAspectClient(web3, aspectAddress);

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
      const data = await aspectClient.getSessionKey(walletAddress, sessionKey, contractAddress);
      setSyncData(data);
    };

    const intervalId = setInterval(() => {
      syncUp();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sessionKey, walletAddress, contractAddress, aspectAddress]);

  const handleQuery = async () => {
    const data = await aspectClient.getSessionKey(mainKeyQP, sessionKeyQP, contractQP);
    setQueryResultQP(data);
  };

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

      let testMethods = methods.split(",").map(method => method.trim())

      await aspectClient.registerSessionKeyByMetamask(walletAddress, sessionKey, contractAddress, testMethods, 20);

    } catch (error) {
      console.error('registerSessionKeyByMetamask fail', error);
    }
  };

  const handleQueryBinding = async () => {
    try {

      let result = await aspectClient.ifBinding(walletAddress)

      setQueryBindingResult(result ? "true" : "false");

    } catch (error) {
      console.error('handleQueryBinding fail', error);
    }
  };

  const handleBind = async () => {
    try {
      await aspectClient.bindEoAByMetamask(walletAddress);

    } catch (error) {
      console.error('bindEoAByMetamask fail', error);
    }
  };

  const handleUnBind = async () => {
    try {

    } catch (error) {
      console.error('registerSessionKeyByMetamask fail', error);
    }
  };

  const handleQueryBindingC = async () => {
    try {

      let result = await aspectClient.ifBinding(contractC)

      setQueryBindingResultC(result ? "true" : "false");

    } catch (error) {
      console.error('handleQueryBindingC fail', error);
    }
  };

  const handleBindC = async () => {
    try {
      await aspectClient.bindContractByMetamask(walletAddress, contractC);
    } catch (error) {
      console.error('registerSessionKeyByMetamask fail', error);
    }
  };

  const handleUnBindC = async () => {
    try {

    } catch (error) {
      console.error('registerSessionKeyByMetamask fail', error);
    }
  };
  
  const handleGetAllSessionKeys = async () => {
    try {
      let ret = await aspectClient.getAllSessionKey(walletAddress);
      setAllSessionKeys(ret);
    } catch (error) {
      console.error('handleGetAllSessionKeys fail', error);
    }
  };

  return (
    <div>
      <div className="center-container-aspect">
        <p className="title">Session Key Aspect</p>
        <div className="input-container">
          <input
            type="text"
            value={aspectAddress}
            onChange={(e) => {
              setAspectAddress(e.target.value)
            }}
            className="session-key-input"
          />
        </div>
      </div>
      <div className='container'>
        <div className="center-container">
          <p className="title-h1">Query session key</p>
          <p className="title">param1: main key address</p>
          <input
            type="text"
            placeholder="0xaabb...ccdd"
            value={mainKeyQP}
            onChange={e => setMainKeyQP(e.target.value)}
            className="session-key-input"
          />
          <p className="title">param2: session key address</p>
          <input
            type="text"
            placeholder="0xaabb...ccdd"
            value={sessionKeyQP}
            onChange={e => setSessionKeyQP(e.target.value)}
            className="session-key-input"
          />
          <p className="title">param3: contract address</p>
          <input
            type="text"
            placeholder="0xaabb...ccdd"
            value={contractQP}
            onChange={e => setContractQP(e.target.value)}
            className="session-key-input"
          />
          <p className="title"></p>
          <button className="register-button" onClick={handleQuery}>Query</button>
          <div>
            <pre>{JSON.stringify(queryResultQP, null, 2)}</pre>
          </div>
        </div>
        <div className="center-container">
          <p className="title-h1">Test registered by Metamask</p>
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
          <div className="input-container">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => {
                console.log("e.target.value", e.target.value);
                setContractAddress(e.target.value)
              }}
              className="session-key-input"
            />
          </div>
          <div className="input-container">
            <input
              type="text"
              value={methods}
              onChange={(e) => {
                console.log("e.target.value", e.target.value);
                setMethods(e.target.value)
              }}
              className="session-key-input"
            />
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleRegister}>register</button>
          </div>
          <p className="title">Query this session key from blockchain</p>
          <div className="info-box">
            <pre>{JSON.stringify(syncData, null, 2)}</pre>
          </div>
        </div>
        <div className="center-container">
          <p className="title-h1">Bind EoA to Aspect</p>
          <p className="title">Connected Wallet</p>
          <p>{walletAddress}</p>
          <div className="button-container">
            <button className="register-button" onClick={handleQueryBinding}>query is binding</button>
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleBind}>bind</button>
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleUnBind}>unbind</button>
          </div>
          <p className="title">Result</p>
          <div className="info-box">
            <pre>{queryBindingResult}</pre>
          </div>
        </div>
        <div className="center-container">
          <p className="title-h1">Bind contract to Aspect</p>
          <p className="title">Connected Wallet</p>
          <p>{walletAddress}</p>
          <p className="title">params 1: contract address</p>
          <div className="input-container">
            <input
              type="text"
              placeholder="0xaabb...ccdd"
              value={contractC}
              onChange={(e) => {
                setContractC(e.target.value)
              }}
              className="session-key-input"
            />
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleQueryBindingC}>query is binding</button>
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleBindC}>bind</button>
          </div>
          <div className="button-container">
            <button className="register-button" onClick={handleUnBindC}>unbind</button>
          </div>
          <p className="title">Result</p>
          <div className="info-box">
            <pre>{queryBindingResultC}</pre>
          </div>
        </div>
        <div className="center-container">
          <p className="title-h1">Your session keys</p>
          <p className="title">Connected Wallet</p>
          <p>{walletAddress}</p>
          <div className="button-container">
            <button className="register-button" onClick={handleGetAllSessionKeys}>query</button>
          </div>
          <p className="title">Result</p>
          <div className="info-box">
            <pre>{allSessionKeys}</pre>
          </div>
        </div>
      </div>
    </div>

  );
}

export default App;
