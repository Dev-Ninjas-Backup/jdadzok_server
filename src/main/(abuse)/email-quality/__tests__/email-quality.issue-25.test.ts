/**
 * Issue #25 — email quality layer (disposable / undeliverable signup emails).
 * Run: npx tsx src/main/(abuse)/email-quality/__tests__/email-quality.issue-25.test.ts
 */
import assert from "node:assert/strict";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserController } from "../../../(users)/users/users.controller";
import { CreateUserDto } from "../../../(users)/users/dto/users.dto";
import { runCases, startMockVendor, TestCase } from "../../__tests__/mock-vendor.server";
import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityService } from "../email-quality.service";
import { createEmailQualityProvider } from "../providers/email-quality-provider.factory";
import { EmailQualityProvider } from "../providers/email-quality-provider.interface";

const cfg = (values: Record<string, string>) => new ConfigService(values);

const serviceFor = (provider: EmailQualityProvider, values: Record<string, string> = {}) =>
    new EmailQualityService(provider, cfg(values));

const failingProvider: EmailQualityProvider = {
    name: EmailQualityProviderName.ABSTRACT,
    check: async () => {
        throw new Error("vendor down");
    },
};

const cases: TestCase[] = [
    {
        name: "factory: default and unknown values fall back to off",
        run: () => {
            assert.equal(createEmailQualityProvider(cfg({})).name, EmailQualityProviderName.OFF);
            assert.equal(
                createEmailQualityProvider(cfg({ ABUSE_EMAIL_PROVIDER: "nope" })).name,
                EmailQualityProviderName.OFF,
            );
        },
    },
    {
        name: "factory: vendor without its key falls back to off, with key is selected",
        run: () => {
            assert.equal(
                createEmailQualityProvider(cfg({ ABUSE_EMAIL_PROVIDER: "abstract" })).name,
                EmailQualityProviderName.OFF,
            );
            assert.equal(
                createEmailQualityProvider(
                    cfg({ ABUSE_EMAIL_PROVIDER: "abstract", ABSTRACT_EMAIL_API_KEY: "k" }),
                ).name,
                EmailQualityProviderName.ABSTRACT,
            );
            assert.equal(
                createEmailQualityProvider(
                    cfg({ ABUSE_EMAIL_PROVIDER: "kickbox", KICKBOX_API_KEY: "k" }),
                ).name,
                EmailQualityProviderName.KICKBOX,
            );
        },
    },
    {
        name: "off: every address passes",
        run: async () => {
            const service = serviceFor(createEmailQualityProvider(cfg({})));
            await service.assertEmailAllowed("someone@mailinator.com");
        },
    },
    {
        name: "memory: disposable and undeliverable are rejected, normal passes",
        run: async () => {
            const service = serviceFor(
                createEmailQualityProvider(cfg({ ABUSE_EMAIL_PROVIDER: "memory" })),
            );
            await assert.rejects(
                service.assertEmailAllowed("a@mailinator.com"),
                BadRequestException,
            );
            await assert.rejects(service.assertEmailAllowed("a@invalid.test"), BadRequestException);
            await service.assertEmailAllowed("real.person@example.org");
        },
    },
    {
        name: "vendor failure fails open by default and closed when configured",
        run: async () => {
            await serviceFor(failingProvider).assertEmailAllowed("a@example.org");
            await assert.rejects(
                serviceFor(failingProvider, { ABUSE_EMAIL_FAIL_CLOSED: "true" }).assertEmailAllowed(
                    "a@example.org",
                ),
                ServiceUnavailableException,
            );
        },
    },
    {
        name: "abstract adapter: sends api_key + email and maps disposable / undeliverable",
        run: async () => {
            const vendor = await startMockVendor((req) => ({
                json: req.url.includes("bad%40")
                    ? { deliverability: "UNDELIVERABLE", is_disposable_email: { value: false } }
                    : req.url.includes("temp%40")
                      ? { deliverability: "DELIVERABLE", is_disposable_email: { value: true } }
                      : { deliverability: "DELIVERABLE", is_disposable_email: { value: false } },
            }));
            try {
                const service = serviceFor(
                    createEmailQualityProvider(
                        cfg({
                            ABUSE_EMAIL_PROVIDER: "abstract",
                            ABSTRACT_EMAIL_API_KEY: "test-key",
                            ABSTRACT_EMAIL_API_BASE: vendor.baseUrl,
                        }),
                    ),
                );
                await service.assertEmailAllowed("good@example.org");
                await assert.rejects(
                    service.assertEmailAllowed("bad@example.org"),
                    BadRequestException,
                );
                await assert.rejects(
                    service.assertEmailAllowed("temp@example.org"),
                    BadRequestException,
                );
                assert.match(vendor.requests[0].url, /api_key=test-key/);
                assert.match(vendor.requests[0].url, /email=good%40example\.org/);
            } finally {
                await vendor.close();
            }
        },
    },
    {
        name: "kickbox adapter: sends apikey + email and maps disposable / undeliverable",
        run: async () => {
            const vendor = await startMockVendor((req) => ({
                json: req.url.includes("bad%40")
                    ? { result: "undeliverable", disposable: false }
                    : req.url.includes("temp%40")
                      ? { result: "deliverable", disposable: true }
                      : { result: "risky", disposable: false },
            }));
            try {
                const service = serviceFor(
                    createEmailQualityProvider(
                        cfg({
                            ABUSE_EMAIL_PROVIDER: "kickbox",
                            KICKBOX_API_KEY: "test-key",
                            KICKBOX_API_BASE: vendor.baseUrl,
                        }),
                    ),
                );
                await service.assertEmailAllowed("good@example.org");
                await assert.rejects(
                    service.assertEmailAllowed("bad@example.org"),
                    BadRequestException,
                );
                await assert.rejects(
                    service.assertEmailAllowed("temp@example.org"),
                    BadRequestException,
                );
                assert.match(vendor.requests[0].url, /^\/verify\?/);
                assert.match(vendor.requests[0].url, /apikey=test-key/);
            } finally {
                await vendor.close();
            }
        },
    },
    {
        name: "controller: a rejected check throws (4xx) instead of being returned as a 200 body",
        run: async () => {
            const service = {
                assertRegistrationAllowed: async () => {
                    throw new BadRequestException("blocked");
                },
                register: async () => {
                    throw new Error("register must not run");
                },
            };
            const controller = new UserController(service as never);
            await assert.rejects(
                controller.register({ email: "a@mailinator.com" } as CreateUserDto),
                BadRequestException,
            );
        },
    },
];

void runCases(cases);
