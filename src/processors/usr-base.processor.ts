import { EthChainId } from "@sentio/sdk/eth";
import { ERC20Processor } from "@sentio/sdk/eth/builtin/erc20";
import type { ERC20Context, TransferEvent } from "@sentio/sdk/eth/builtin/erc20";
import { config } from "../config.js";
import {
  BASE_CHAIN,
  ErrorType,
  EXCLUDED_CONTRACTS,
  USR_DECIMALS,
  ZERO_ADDRESS,
} from "../constants.js";

ERC20Processor.bind({
  address: config.usrBaseAddress,
  network: EthChainId.BASE,
  startBlock: config.startBlock,
})
  .onEventTransfer(handleTransferEvent)
  .onTimeInterval(handleTimeInterval, config.timeIntervalMinutes, config.backfillIntervalMinutes);

async function handleTransferEvent(event: TransferEvent, ctx: ERC20Context) {
  try {
    const { blockNumber, contract, eventLogger, meter } = ctx;

    if (!event || !event.args) {
      eventLogger.emit("error", {
        errorType: ErrorType.INVALID_EVENT_DATA,
        message: "Invalid transfer event: missing event or args",
        block: blockNumber,
      });
      return;
    }

    const { transactionHash } = event;
    const { from, to, value } = event.args;

    if (!from || !to) {
      eventLogger.emit("error", {
        errorType: ErrorType.INVALID_EVENT_DATA,
        message: "Invalid transfer event: missing from or to address",
        txHash: transactionHash,
        block: blockNumber,
      });
      return;
    }

    if (!value || value < 0n) {
      eventLogger.emit("error", {
        errorType: ErrorType.INVALID_EVENT_DATA,
        message: "Invalid transfer event: invalid value",
        txHash: transactionHash,
        from,
        to,
        block: blockNumber,
      });
      return;
    }

    const logIndex = (event as unknown as { logIndex?: number }).logIndex || 0;
    const amount = value.scaleDown(USR_DECIMALS);

    eventLogger.emit("usr_transfer", {
      distinctId: `${transactionHash}-${logIndex}`,
      from,
      to,
      amount,
      network: BASE_CHAIN,
      block: blockNumber,
      txHash: transactionHash,
      logIndex,
    });

    const isFromExcluded = Array.from(EXCLUDED_CONTRACTS).some(
      (addr) => addr.toLowerCase() === from.toLowerCase(),
    );

    if (from !== ZERO_ADDRESS && !isFromExcluded) {
      try {
        const senderBalance = await contract.balanceOf(from);
        const senderBalanceScaled = senderBalance.scaleDown(USR_DECIMALS);

        eventLogger.emit("usr_balance_update", {
          distinctId: `${from}-${blockNumber}-${logIndex}`,
          holder: from,
          balance: senderBalanceScaled,
          network: BASE_CHAIN,
          block: blockNumber,
          updateType: "transfer_out",
        });

        meter.Gauge("usr_balance").record(senderBalanceScaled, {
          holder: from,
          network: BASE_CHAIN,
        });
      } catch (error) {
        eventLogger.emit("error", {
          errorType: ErrorType.CONTRACT_CALL_FAILED,
          message: `Failed to get balance for sender: ${error instanceof Error ? error.message : "Unknown error"}`,
          holder: from,
          txHash: transactionHash,
          block: blockNumber,
        });
      }
    }

    const isToExcluded = Array.from(EXCLUDED_CONTRACTS).some(
      (addr) => addr.toLowerCase() === to.toLowerCase(),
    );

    if (to !== ZERO_ADDRESS && !isToExcluded) {
      try {
        const receiverBalance = await contract.balanceOf(to);
        const receiverBalanceScaled = receiverBalance.scaleDown(USR_DECIMALS);

        eventLogger.emit("usr_balance_update", {
          distinctId: `${to}-${blockNumber}-${logIndex}`,
          holder: to,
          balance: receiverBalanceScaled,
          network: BASE_CHAIN,
          block: blockNumber,
          updateType: "transfer_in",
        });

        meter.Gauge("usr_balance").record(receiverBalanceScaled, {
          holder: to,
          network: BASE_CHAIN,
        });
      } catch (error) {
        eventLogger.emit("error", {
          errorType: ErrorType.CONTRACT_CALL_FAILED,
          message: `Failed to get balance for receiver: ${error instanceof Error ? error.message : "Unknown error"}`,
          holder: to,
          txHash: transactionHash,
          block: blockNumber,
        });
      }
    }
  } catch (error) {
    ctx.eventLogger.emit("error", {
      errorType: ErrorType.PROCESSING_ERROR,
      message: `Unexpected error in handleTransferEvent: ${error instanceof Error ? error.message : "Unknown error"}`,
      txHash: event?.transactionHash,
      block: ctx.blockNumber,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

async function handleTimeInterval(_: unknown, ctx: ERC20Context) {
  try {
    const { blockNumber, contract, eventLogger, meter } = ctx;

    let totalSupply;
    try {
      totalSupply = await contract.totalSupply();
    } catch (error) {
      eventLogger.emit("error", {
        errorType: ErrorType.CONTRACT_CALL_FAILED,
        message: `Failed to get total supply: ${error instanceof Error ? error.message : "Unknown error"}`,
        block: blockNumber,
      });
      return;
    }

    if (!totalSupply || totalSupply < 0n) {
      eventLogger.emit("error", {
        errorType: ErrorType.INVALID_EVENT_DATA,
        message: "Invalid total supply value",
        block: blockNumber,
      });
      return;
    }

    const totalSupplyScaled = totalSupply.scaleDown(USR_DECIMALS);

    eventLogger.emit("usr_total_supply", {
      distinctId: `${BASE_CHAIN}-${blockNumber}`,
      totalSupply: totalSupplyScaled,
      network: BASE_CHAIN,
      block: blockNumber,
    });

    meter.Gauge("usr_total_supply").record(totalSupplyScaled, {
      network: BASE_CHAIN,
    });
  } catch (error) {
    ctx.eventLogger.emit("error", {
      errorType: ErrorType.PROCESSING_ERROR,
      message: `Unexpected error in handleTimeInterval: ${error instanceof Error ? error.message : "Unknown error"}`,
      block: ctx.blockNumber,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
