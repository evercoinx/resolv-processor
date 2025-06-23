# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Sentio processor that tracks USR (Resolv USD) token holdings on Base network. The processor monitors transfer events, maintains real-time balance updates, and tracks total supply metrics.

## Essential Commands

### Development Workflow
```bash
# Install dependencies
npm install

# Build TypeScript and Sentio processor
npm run build

# Deploy to Sentio (build + upload)
npm run deploy

# Code quality
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
npm run format        # Check formatting
npm run format:fix    # Fix formatting
```

### Sentio CLI Setup (if not installed)
```bash
npm install -g @sentio/cli
sentio login
```

## Architecture

### Core Components

1. **processor.ts** - Main entry point that imports all processors

2. **processors/usr-base.processor.ts** - USR token processor that:
   - Binds to USR token contract on Base
   - Processes Transfer events to track balance changes
   - Emits structured events for analytics
   - Monitors total supply at configurable intervals

3. **Event Types**:
   - `usr_transfer` - Raw transfer events
   - `usr_balance_update` - Balance changes per holder
   - `usr_total_supply` - Periodic supply snapshots

### Key Contract Address
- **USR Base**: Configurable via `USR_BASE_ADDRESS` environment variable (required)

### Configuration
The project uses Joi for environment variable validation. All configuration is centralized in `src/config.ts`. Key environment variables:
- `USR_BASE_ADDRESS`: USR token address (required, validated as Ethereum address)
- `TIME_INTERVAL_MINUTES`: Time interval for periodic total supply checks (default: 60)
- `BACKFILL_INTERVAL_MINUTES`: Backfill interval for historical data processing (default: 60)

### Technical Considerations

1. **Decimal Handling**: USR has 18 decimals. All values are scaled down using `scaleDown(18)`.

2. **Distinct IDs**:
   - Transfers: Use transaction hash
   - Balance updates: `${address}-${blockNumber}`
   - Total supply: `${chain}-${blockNumber}`

3. **Balance Update Logic**: 
   - Updates both sender and receiver balances on each transfer
   - Handles minting (from 0x0) and burning (to 0x0) specially
   - Tracks `updateType` as `transfer_in` or `transfer_out`

4. **Time Intervals**: 
   - Total supply check interval configurable via `TIME_INTERVAL_MINUTES`
   - Backfill interval configurable via `BACKFILL_INTERVAL_MINUTES`
   - Both default to 60 minutes if not specified

## Project Structure
```
resolv-sentio-processor/
├── src/
│   ├── processor.ts      # Main entry point that imports all processors
│   ├── config.ts         # Environment configuration with Joi validation
│   ├── processors/       # Individual processor implementations
│   │   ├── index.ts      # Exports all processors
│   │   └── usr-base.processor.ts  # USR token processor for Base network
│   └── abis/
│       └── USR.json      # USR token ABI
├── sentio.yaml           # Sentio configuration
├── package.json          # Node.js configuration
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Example environment variables
└── .env                  # Local environment variables (gitignored)
```

## Adding New Processors

To add a new processor:
1. Create a new file in `src/processors/` (e.g., `token-name.processor.ts`)
2. Implement your processor logic similar to `usr-base.processor.ts`
3. Import it in `src/processor.ts`
4. Update configuration in `src/config.ts` if needed

## Related Documentation
- **README.md** - Detailed project documentation with SQL query examples
- **superform-resolv-tracking-docs.md** - Context about USR usage in DeFi protocols