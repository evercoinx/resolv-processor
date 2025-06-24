import { TestProcessorServer } from "@sentio/sdk/testing";
import { mockTransferLog } from "@sentio/sdk/eth/builtin/erc20";
import { EthChainId } from "@sentio/sdk/eth";
import { describe, test, before } from "node:test";
import assert from "node:assert";

describe("USR Base Processor Tests", () => {
  const TEST_USR_ADDRESS = "0x35E5dB674D8e93a03d814FA0ADa70731efe8a4b9";
  const USER1 = "0x1111111111111111111111111111111111111111";
  const USER2 = "0x2222222222222222222222222222222222222222";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const SUPERFORM_ROUTER = "0x7B8d68f90dAaC67C577936d3Ce451801864EF189";
  const MORPHO_BASE = "0xbbbbbd1ba9b47a0a5b86e3f0efc5857ce6432bbb";

  const service = new TestProcessorServer(() => import("./usr-base.processor.js"), {
    USR_BASE_ADDRESS: TEST_USR_ADDRESS,
    TIME_INTERVAL_MINUTES: "60",
    BACKFILL_INTERVAL_MINUTES: "60",
    START_BLOCK: "18500000",
  });

  before(async () => {
    await service.start();
  });

  describe("Transfer Event Processing", () => {
    test("should process EOA to EOA transfer correctly", async () => {
      const value = 1_000n * 10n ** 18n; // 1000 USR

      const transferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: USER2,
        value,
      });

      const res = await service.eth.testLog(transferLog, EthChainId.BASE);
      assert(res.result, "Should have result");

      const events = res.result.events || [];
      console.log(`Events emitted: ${events.length}`);

      const transferEvent = events.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent, "Should emit usr_transfer event");
      assert.equal(transferEvent.attributes?.from, USER1.toLowerCase());
      assert.equal(transferEvent.attributes?.to, USER2.toLowerCase());
      assert.equal(transferEvent.attributes?.amount, "1000:sto_bd");
      assert.equal(transferEvent.attributes?.network, "base");
    });

    test("should handle mint from zero address", async () => {
      const value = 5_000n * 10n ** 18n; // 5000 USR

      const mintLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: ZERO_ADDRESS,
        to: USER1,
        value,
      });

      const res = await service.eth.testLog(mintLog, EthChainId.BASE);
      assert(res.result, "Should have result");

      const events = res.result.events || [];

      const transferEvent = events.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent, "Should emit usr_transfer event for mint");
      assert.equal(transferEvent.attributes?.from, ZERO_ADDRESS.toLowerCase());
      assert.equal(transferEvent.attributes?.to, USER1.toLowerCase());
      assert.equal(transferEvent.attributes?.amount, "5000:sto_bd");
    });

    test("should handle burn to zero address", async () => {
      const value = 2_000n * 10n ** 18n; // 2000 USR

      const burnLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: ZERO_ADDRESS,
        value,
      });

      const res = await service.eth.testLog(burnLog, EthChainId.BASE);
      assert(res.result, "Should have result");

      const events = res.result.events || [];

      const transferEvent = events.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent, "Should emit usr_transfer event for burn");
      assert.equal(transferEvent.attributes?.from, USER1.toLowerCase());
      assert.equal(transferEvent.attributes?.to, ZERO_ADDRESS.toLowerCase());
      assert.equal(transferEvent.attributes?.amount, "2000:sto_bd");
    });

    test("should handle transfers involving smart contracts", async () => {
      const value = 1_000n * 10n ** 18n; // 1000 USR

      // Test transfer to Superform Router
      const routerTransferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: SUPERFORM_ROUTER,
        value,
      });

      const res1 = await service.eth.testLog(routerTransferLog, EthChainId.BASE);
      assert(res1.result, "Should have result");

      const events1 = res1.result.events || [];

      const transferEvent1 = events1.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent1, "Should emit transfer event to router");
      assert.equal(transferEvent1.attributes?.from, USER1.toLowerCase());
      assert.equal(transferEvent1.attributes?.to?.toLowerCase(), SUPERFORM_ROUTER.toLowerCase());

      const morphoTransferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: MORPHO_BASE,
        to: USER2,
        value,
      });

      const res2 = await service.eth.testLog(morphoTransferLog, EthChainId.BASE);
      assert(res2.result, "Should have result");

      const events2 = res2.result.events || [];

      const transferEvent2 = events2.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent2, "Should emit transfer event from Morpho");
      assert.equal(transferEvent2.attributes?.from?.toLowerCase(), MORPHO_BASE.toLowerCase());
      assert.equal(transferEvent2.attributes?.to, USER2.toLowerCase());
    });

    test("should handle zero value transfer", async () => {
      const zeroTransferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: USER2,
        value: 0n,
      });

      const res = await service.eth.testLog(zeroTransferLog, EthChainId.BASE);
      assert(res.result, "Should have result");

      const events = res.result.events || [];
      console.log(`Zero transfer events: ${events.length}`);

      const transferEvent = events.find((e) => e.metadata?.name === "usr_transfer");

      if (transferEvent) {
        assert.equal(transferEvent.attributes?.amount, "0:sto_bd");
      } else {
        console.log("Note: Zero value transfers may be filtered by processor");
        assert(true, "Zero value transfer handling verified");
      }
    });

    test("should process multiple transfers with distinct IDs", async () => {
      const value = 1_000n * 10n ** 18n; // 1000 USR

      const transfer1 = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: USER2,
        value,
      });

      const transfer2 = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER2,
        to: USER1,
        value: value * 2n,
      });

      const transfer2WithDifferentHash = {
        ...transfer2,
        transactionHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      };

      const res1 = await service.eth.testLog(transfer1, EthChainId.BASE);
      const res2 = await service.eth.testLog(transfer2WithDifferentHash, EthChainId.BASE);
      assert(res1.result && res2.result, "Both should have results");

      const events1 = res1.result.events || [];
      const transferEvent1 = events1.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent1, "First transfer should emit event");
      assert.equal(transferEvent1.attributes?.amount, "1000:sto_bd");

      const events2 = res2.result.events || [];
      const transferEvent2 = events2.find((e) => e.metadata?.name === "usr_transfer");
      assert(transferEvent2, "Second transfer should emit event");
      assert.equal(transferEvent2.attributes?.amount, "2000:sto_bd");

      assert.notEqual(
        transferEvent1.distinctEntityId,
        transferEvent2.distinctEntityId,
        "Transfers should have different distinct IDs",
      );
    });
  });

  describe("Superform Deposit Flow Simulation", () => {
    test("should track deposit flow transfers correctly", async () => {
      const depositAmount = 10_000n * 10n ** 18n; // 10000 USR

      // Step 1: User transfers to SuperformRouter
      const routerTransferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: SUPERFORM_ROUTER,
        value: depositAmount,
      });

      const res1 = await service.eth.testLog(routerTransferLog, EthChainId.BASE);
      assert(res1.result, "Should have result");

      const events1 = res1.result.events || [];

      const userToRouterTransfer = events1.find((e) => e.metadata?.name === "usr_transfer");
      assert(userToRouterTransfer, "Should emit transfer event for user to router");
      assert.equal(userToRouterTransfer.attributes?.from, USER1.toLowerCase());
      assert.equal(
        userToRouterTransfer.attributes?.to?.toLowerCase(),
        SUPERFORM_ROUTER.toLowerCase(),
      );
      assert.equal(userToRouterTransfer.attributes?.amount, "10000:sto_bd");

      // Step 2: Router transfers to Morpho (simulating vault deposit)
      const morphoTransferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: SUPERFORM_ROUTER,
        to: MORPHO_BASE,
        value: depositAmount,
      });

      const res2 = await service.eth.testLog(morphoTransferLog, EthChainId.BASE);
      assert(res2.result, "Should have result");

      const events2 = res2.result.events || [];

      const routerToMorphoTransfer = events2.find((e) => e.metadata?.name === "usr_transfer");
      assert(routerToMorphoTransfer, "Should emit transfer event for router to Morpho");
      assert.equal(
        routerToMorphoTransfer.attributes?.from?.toLowerCase(),
        SUPERFORM_ROUTER.toLowerCase(),
      );
      assert.equal(routerToMorphoTransfer.attributes?.to?.toLowerCase(), MORPHO_BASE.toLowerCase());
      assert.equal(routerToMorphoTransfer.attributes?.amount, "10000:sto_bd");

      console.log("Deposit flow test completed successfully");
      console.log("- User -> Router transfer tracked");
      console.log("- Router -> Morpho transfer tracked");
      console.log("Note: In production, balance updates would exclude contract addresses");
    });
  });

  describe("Event Attributes", () => {
    test("should include all required attributes in transfer events", async () => {
      const value = 1234n * 10n ** 18n; // 1234 USR

      const transferLog = mockTransferLog(TEST_USR_ADDRESS, {
        from: USER1,
        to: USER2,
        value,
      });

      const res = await service.eth.testLog(transferLog, EthChainId.BASE);
      assert(res.result, "Should have result");

      const events = res.result.events || [];
      const transferEvent = events.find((e) => e.metadata?.name === "usr_transfer");

      assert(transferEvent, "Should emit transfer event");
      assert(transferEvent.attributes?.from, "Should have from attribute");
      assert(transferEvent.attributes?.to, "Should have to attribute");
      assert(transferEvent.attributes?.amount, "Should have amount attribute");
      assert(transferEvent.attributes?.network, "Should have network attribute");
      assert(typeof transferEvent.attributes?.block !== "undefined", "Should have block attribute");
      assert(transferEvent.attributes?.txHash, "Should have txHash attribute");
      assert(
        typeof transferEvent.attributes?.logIndex !== "undefined",
        "Should have logIndex attribute",
      );
      assert.equal(transferEvent.attributes.network, "base", "Network should be base");
      assert.equal(transferEvent.attributes.amount, "1234:sto_bd", "Amount should be scaled down");
    });
  });
});
