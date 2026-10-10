import { IncomingMessage, createServer } from "node:http";
import { AddressInfo } from "node:net";

export interface RecordedRequest {
    method: string;
    url: string;
    headers: IncomingMessage["headers"];
    body: string;
}

export interface MockVendor {
    baseUrl: string;
    requests: RecordedRequest[];
    close: () => Promise<void>;
}

/** Local HTTP server standing in for a vendor API, so adapters are tested without network or keys. */
export async function startMockVendor(
    respond: (req: RecordedRequest) => { status?: number; json: unknown },
): Promise<MockVendor> {
    const requests: RecordedRequest[] = [];

    const server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
            const recorded: RecordedRequest = {
                method: req.method ?? "",
                url: req.url ?? "",
                headers: req.headers,
                body: Buffer.concat(chunks).toString("utf8"),
            };
            requests.push(recorded);
            const { status = 200, json } = respond(recorded);
            res.writeHead(status, { "Content-Type": "application/json" });
            res.end(JSON.stringify(json));
        });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        requests,
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
}

export interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

export async function runCases(cases: TestCase[]): Promise<void> {
    let failed = 0;
    for (const tc of cases) {
        try {
            await tc.run();
            console.log(`  PASS  ${tc.name}`);
        } catch (err) {
            failed += 1;
            console.log(`  FAIL  ${tc.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    console.log(`\n${cases.length - failed}/${cases.length} passed`);
    if (failed > 0) process.exit(1);
}
