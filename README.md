# Resolv USR Holdings Tracker - Sentio Processor

This Sentio processor tracks historical holdings amounts of all USR holders (plain USR tokens, not deposited anywhere) on Base network.

## Features

- Tracks all USR token transfers on Base
- Updates holder balances in real-time
- Records historical balance changes
- Monitors total supply periodically
- Comprehensive error handling with categorized error events
- Emits events for:
  - `usr_transfer`: All transfer events with unique IDs (includes logIndex)
  - `usr_balance_update`: Balance changes for each holder
  - `usr_total_supply`: Periodic total supply snapshots
  - `error`: Categorized error events for debugging and monitoring

## Documentation

Documentation is available in the `docs/` directory:

- [Superform Resolv Tracking](docs/superform-resolv-tracking.md) - Context about USR usage in DeFi protocols and integration with Superform

## Configuration

The processor uses hardcoded defaults for production deployment on Sentio, with the ability to override values during local development using environment variables.

### Production Defaults
- **USR_BASE_ADDRESS**: `0x35E5dB674D8e93a03d814FA0ADa70731efe8a4b9`
- **TIME_INTERVAL_MINUTES**: `60`
- **BACKFILL_INTERVAL_MINUTES**: `60`
- **START_BLOCK**: `18500000`

### Local Development
For local development, you can override these values using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `USR_BASE_ADDRESS` | USR token address on Base network | `0x35E5dB674D8e93a03d814FA0ADa70731efe8a4b9` |
| `TIME_INTERVAL_MINUTES` | Time interval for periodic total supply checks | `60` |
| `BACKFILL_INTERVAL_MINUTES` | Backfill interval for historical data processing | `60` |
| `START_BLOCK` | Block number to start processing from | `18500000` |

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **For local development only** (optional):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if you need to override default values for testing.

3. **Create a Sentio account**:
   - Go to https://app.sentio.xyz/
   - Sign up for a free account
   - Create a new project

4. **Install and configure Sentio CLI**:
   ```bash
   # Install Sentio CLI globally
   npm install -g @sentio/cli
   
   # Login to your Sentio account
   sentio login
   ```

5. **Build and deploy to Sentio**:
   ```bash
   npm run deploy
   ```
   
   This command will build and upload the processor in one step.

## Data Output

The processor emits the following data:

### Events

1. **usr_transfer**
   - `from`: Sender address
   - `to`: Receiver address
   - `amount`: Transfer amount (scaled to human-readable format)
   - `network`: 'base'
   - `block`: Block number
   - `txHash`: Transaction hash
   - `logIndex`: Log index within the transaction

2. **usr_balance_update**
   - `holder`: Holder address
   - `balance`: Current balance (scaled)
   - `network`: 'base'
   - `block`: Block number
   - `updateType`: 'transfer_in' or 'transfer_out'

3. **usr_total_supply**
   - `totalSupply`: Total supply (scaled)
   - `network`: 'base'
   - `block`: Block number

4. **error**
   - `errorType`: Error category (CONTRACT_CALL_FAILED, INVALID_EVENT_DATA, PROCESSING_ERROR)
   - `message`: Human-readable error description
   - `block`: Block number where error occurred
   - `timestamp`: Timestamp of the error
   - Additional context fields depending on error type

### Metrics

1. **usr_balance** (Gauge)
   - Tracks current balance for each holder
   - Labels: `holder`, `chain`

2. **usr_total_supply** (Gauge)
   - Tracks total supply over time
   - Labels: `chain`

## Notes

- The processor tracks only plain USR holdings (not deposited in protocols)
- Balance updates are triggered by Transfer events
- Historical data is backfilled automatically
- Total supply is checked every 60 minutes (configurable)
- Transfer events now include logIndex for unique identification within transactions