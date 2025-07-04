export const USR_DECIMALS = 18;
export const BASE_CHAIN = "base";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const EXCLUDED_CONTRACTS = new Set([
  "0x7B8d68f90dAaC67C577936d3Ce451801864EF189", // SuperformRouter
  "0xD85ec15A9F814D6173bF1a89273bFB3964aAdaEC", // SuperformFactory
  "0xBBBBBd1bA9b47a0A5b86E3f0eFC5857CE6432Bbb", // Morpho USR lending market
  "0xEfE170fd8b2621C59B051a6637f64D6a87FB4f4A", // Morpho ERC4626Form USR Vault
]);

export enum ErrorType {
  CONTRACT_CALL_FAILED = "CONTRACT_CALL_FAILED",
  INVALID_EVENT_DATA = "INVALID_EVENT_DATA",
  PROCESSING_ERROR = "PROCESSING_ERROR",
}
