import dotenv from "dotenv";

dotenv.config();

const DEFAULTS = {
  USR_BASE_ADDRESS: "0x35E5dB674D8e93a03d814FA0ADa70731efe8a4b9",
  TIME_INTERVAL_MINUTES: 60,
  BACKFILL_INTERVAL_MINUTES: 60,
  START_BLOCK: 18_500_000, // USR token deployment block on Base (Oct 2024)
};

export const config = {
  usrBaseAddress: (process.env.USR_BASE_ADDRESS || DEFAULTS.USR_BASE_ADDRESS) as `0x${string}`,
  timeIntervalMinutes: Number(process.env.TIME_INTERVAL_MINUTES) || DEFAULTS.TIME_INTERVAL_MINUTES,
  backfillIntervalMinutes: Number(process.env.BACKFILL_INTERVAL_MINUTES) || DEFAULTS.BACKFILL_INTERVAL_MINUTES,
  startBlock: Number(process.env.START_BLOCK) || DEFAULTS.START_BLOCK,
};

if (process.env.NODE_ENV !== "production") {
  console.log("Processor configuration:", {
    usrBaseAddress: config.usrBaseAddress,
    timeIntervalMinutes: config.timeIntervalMinutes,
    backfillIntervalMinutes: config.backfillIntervalMinutes,
    startBlock: config.startBlock
  });
}

export type Config = typeof config;
