import { arbitrum, base, Chain, mainnet, sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains'

let chains = [mainnet, arbitrum, base, sepolia, baseSepolia, arbitrumSepolia] as [Chain, ...Chain[]]

export const ETH_CHAINS = chains
