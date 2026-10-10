/**
 * Issue #25 — bot challenge layer (Turnstile-style token verification on signup).
 * Run: npx tsx src/main/(abuse)/bot-challenge/__tests__/bot-challenge.issue-25.test.ts
 */
import assert from "node:assert/strict";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { runCases, startMockVendor, TestCase } from "../../__tests__/mock-vendor.server";
import { BotChallengeProviderName, MEMORY_BOT_PASS_TOKEN } from "../bot-challenge.constants";
import { BotChallengeService } from "../bot-challenge.service";
import { createBotChallengeProvider } from "../providers/bot-challenge-provider.factory";
import { BotChallengeProvider } from "../providers/bot-challenge-provider.interface";

const cfg = (values: Record<string, string>) => new ConfigService(values);

const serviceFor = (provider: BotChallengeProvider, values: Record<string, string> = {}) =>
    new BotChallengeService(provider, cfg(values));

const failingProvider: BotChallengeProvider = {
    name: BotChallengeProviderName.TURNSTILE,
    verify: async () => {
        throw new Error("vendor down");
    },
};

const cases: TestCase[] = [
    {
        name: "factory: default / unknown / turnstile-without-secret all fall back to off",
        run: () => {
            assert.equal(createBotChallengeProvider(cfg({})).name, BotChallengeProviderName.OFF);
            assert.equal(
                createBotChallengeProvider(cfg({ ABUSE_BOT_PROVIDER: "nope" })).name,
                BotChallengeProviderName.OFF,
            );
            assert.equal(
                createBotChallengeProvider(cfg({ ABUSE_BOT_PROVIDER: "turnstile" })).name,
                BotChallengeProviderName.OFF,
            );
            assert.equal(
                createBotChallengeProvider(
                    cfg({ ABUSE_BOT_PROVIDER: "turnstile", TURNSTILE_SECRET_KEY: "s" }),
                ).name,
                BotChallengeProviderName.TURNSTILE,
            );
        },
    },
    {
        name: "off: no token needed",
        run: async () => {
            await serviceFor(createBotChallengeProvider(cfg({}))).assertHuman(undefined);
        },
    },
    {
        name: "memory: missing and wrong tokens are rejected, the pass token is accepted",
        run: async () => {
            const service = serviceFor(
                createBotChallengeProvider(cfg({ ABUSE_BOT_PROVIDER: "memory" })),
            );
            await assert.rejects(service.assertHuman(undefined), BadRequestException);
            await assert.rejects(service.assertHuman("bot-token"), BadRequestException);
            await service.assertHuman(MEMORY_BOT_PASS_TOKEN);
        },
    },
    {
        name: "vendor failure fails open by default and closed when configured",
        run: async () => {
            await serviceFor(failingProvider).assertHuman("any-token");
            await assert.rejects(
                serviceFor(failingProvider, { ABUSE_BOT_FAIL_CLOSED: "true" }).assertHuman(
                    "any-token",
                ),
                ServiceUnavailableException,
            );
        },
    },
    {
        name: "turnstile adapter: posts secret + response and honours success true / false",
        run: async () => {
            const vendor = await startMockVendor((req) => ({
                json: { success: new URLSearchParams(req.body).get("response") === "human-token" },
            }));
            try {
                const service = serviceFor(
                    createBotChallengeProvider(
                        cfg({
                            ABUSE_BOT_PROVIDER: "turnstile",
                            TURNSTILE_SECRET_KEY: "test-secret",
                            TURNSTILE_VERIFY_URL: `${vendor.baseUrl}/siteverify`,
                        }),
                    ),
                );
                await service.assertHuman("human-token");
                await assert.rejects(service.assertHuman("bot-token"), BadRequestException);

                const sent = new URLSearchParams(vendor.requests[0].body);
                assert.equal(vendor.requests[0].method, "POST");
                assert.equal(vendor.requests[0].url, "/siteverify");
                assert.equal(sent.get("secret"), "test-secret");
                assert.equal(sent.get("response"), "human-token");
            } finally {
                await vendor.close();
            }
        },
    },
];

void runCases(cases);
