# Tracking Resolv Asset Deposits in Superform Vaults on Base

## Executive Summary

This document outlines how to track deposits of Resolv assets (USR, RLP, and wstUSR) into Superform vaults on Base network, including the full flow of funds and the methodology for tracking end-user USD position values.

## 1. Key Smart Contracts on Base & Fund Flow

### 1.1 Resolv Protocol Contracts

#### Token Contracts
- **USR (Resolv USD)**: `0x35E5dB674D8e93a03d814FA0ADa70731efe8a4b9`
  
- **RLP (Resolv Liquidity Provider)**: `0xc31389794ffac23331e0d9f611b7953f90aa5fdc`
  
- **wstUSR (Wrapped Staked USR)**: `0x1202f5c7b4b9e47a1a484e8b270be34dbbc75055`

#### Vault-Specific
- **MEV Capital Resolv USR Vault**: Active vault accepting USR deposits on Morpho (Base)

### 1.2 Superform Protocol Contracts

#### Core Infrastructure
- **SuperformRouter**: The entry point for deposits, handles routing of transactions
- **SuperformFactory**: Creates and manages Superform wrappers
- **CoreStateRegistry**: Manages deposit state across chains
- **Cross-chain AMBs**: LayerZero, Wormhole, Hyperlane, Axelar implementations

### 1.3 Complete Fund Flow

```
┌─────────────────┐
│   User Wallet   │
└────────┬────────┘
         │
         ├──────1. Approve tokens────────┐
         │                               ▼
         │                    ┌──────────────────────────┐
         │                    │ USR/RLP/wstUSR Token     │
         │                    │      Contract            │
         │                    └──────────────────────────┘
         │
         └──────2. Initiate deposit──────┐
                                         ▼
                              ┌──────────────────────┐
                              │  SuperformRouter     │
                              └──────────┬───────────┘
                                        │
                    ┌───────────────────┼────────────────┐
                    │                   │                │
     3. Route transaction        7. Mint SuperPosition   │
                    ▼                   ▼                │
         ┌──────────────────┐  ┌─────────────────────┐   │
         │ SuperformFactory │  │ User receives       │   │
         └──────────┬───────┘  │ ERC-1155 NFT        │   │
                    │          └─────────────────────┘   │
     4. Create/Use Superform                             │
                    ▼                                    │
         ┌──────────────────────┐                        │
         │ ERC4626Form Wrapper  │◄───────────────────────┘
         └──────────┬───────────┘
                    │
         5. Deposit to vault
                    ▼
         ┌────────────────────────┐
         │    Target Vault        │
         │ (e.g., MEV Capital USR)│
         └──────────┬─────────────┘
                    │
         6. Deploy to markets
                    ▼
         ┌────────────────────────┐
         │  Underlying Protocol   │
         │    (e.g., Morpho)      │
         └────────────────────────┘
```

#### Flow Steps:

1. **Token Approval**: User approves SuperformRouter to spend their USR/RLP/wstUSR tokens
2. **Deposit Initiation**: User calls deposit function on SuperformRouter with:
   - Token amount
   - Target vault ID
   - Slippage parameters
   - Cross-chain parameters (if applicable)

3. **Routing**: SuperformRouter determines optimal path:
   - Same-chain: Direct deposit
   - Cross-chain: Routes through AMB (Axelar, LayerZero, etc.)

4. **Superform Creation**: If first deposit to vault, creates new Superform wrapper via SuperformFactory

5. **Vault Deposit**: Funds deposited into ERC-4626 compliant vault

6. **SuperPosition Minting**: User receives ERC-1155 NFT representing their position

7. **Underlying Deployment**: Vault deploys funds to yield strategies (e.g., Morpho markets)

## 2. Tracking End-User USD Position Value

### 2.1 Data Sources for Position Tracking

#### Primary Data Points
1. **SuperPosition Balance**: Query the ERC-1155 balance for the user
2. **Vault Share Price**: Get the current share price from a vault contract
3. **Underlying Asset Price**: The USD price of USR/RLP/wstUSR

### 2.2 Position Value Calculation Schema

The USD value calculation follows this formula:
1. Get the SuperPosition balance (ERC-1155 tokens held by the user)
2. Query the vault share price from the ERC-4626 vault contract
3. Calculate underlying assets: `superPositionBalance * sharePrice / 1e18`
4. Apply the asset USD price (USR = $1, RLP/wstUSR from oracle)
5. Final the USD value: `underlyingAssets * assetPrice / 1e18`

### 2.3 Excluding Smart Contract Holdings

#### Contracts to Exclude
1. **Protocol Contracts**:
   - SuperformRouter addresses
   - SuperformFactory
   - Cross-chain bridge contracts
   - Vault implementation contracts

2. **Intermediate Contracts**:
   - Morpho Pool contracts (when vault deposits there)
   - Lending protocol contracts
   - DEX liquidity pools

### 2.4 Tracking Vault → Market Flow

When vaults deploy to underlying markets (e.g., Morpho):

1. **Monitor Vault Events**: Track Deposit/Withdraw events from vault contracts

2. **Track Market Positions**:
   - Morpho: Query vault's position in specific markets
   - Compound: Check cToken balances
   - Aave: Check aToken balances

3. **Calculate Effective Yields**: Aggregate vault TVL with underlying market positions and APY

## Summary

Tracking Resolv asset deposits in Superform requires:
- Monitoring SuperformRouter for deposit/withdraw events
- Tracking SuperPosition ERC-1155 NFTs to identify user holdings
- Calculating USD values using vault share prices and asset oracles
- Excluding intermediate contract holdings through a whitelist
- Following fund flows to underlying markets (Morpho, etc.) for complete position tracking
