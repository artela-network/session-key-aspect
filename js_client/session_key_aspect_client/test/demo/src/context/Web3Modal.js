'use client';

import {
    getDefaultWallets,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';

import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

const artela = {
    id: 11820,
    name: 'Artela',
    network: 'artela-testnet-2',
    iconUrl: 'https://framerusercontent.com/images/xLv7JZ8nzPaZ9zk7j63YbRZHqY.png',
    iconBackground: '#fff',
    nativeCurrency: {
        decimals: 18,
        name: 'Artela',
        symbol: 'ART',
    },
    rpcUrls: {
        public: { http: ['https://betanet-rpc1.artela.network/'] },
        default: { http: ['https://betanet-rpc1.artela.network/'] },
    },
    blockExplorers: {
        default: { name: 'SnowTrace', url: 'https://betanet-scan.artela.network/' },
        etherscan: { name: 'SnowTrace', url: 'https://betanet-scan.artela.network/' },
    },
    testnet: false,
};

const { chains, publicClient } = configureChains(
    [artela],
    [
        alchemyProvider({ apiKey: "b4dmYzJ5ztY18ziStcClJ_jRjEdieQqo" }),
        publicProvider()
    ]
);

const { connectors } = getDefaultWallets({
    appName: 'My RainbowKit App',
    projectId: '080999b35ff4ade22e595b9aeb16db24',
    chains
});

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
})

export function Web3Modal(children) {
    return <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider modalSize="compact" locale="en-US" chains={chains}>
            {children}
        </RainbowKitProvider>
    </WagmiConfig>
}
