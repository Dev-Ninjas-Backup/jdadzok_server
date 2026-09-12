# TURN relay for calls (Issue #40)

## Why this exists

Calls were STUN-only. STUN can discover a peer's public address but cannot create
one, so a call only connects when both sides are directly reachable — same
Wi-Fi/LAN, or a NAT that happens to permit it. On cellular and CGNAT neither side
has a routable address to offer, no ICE candidate pair succeeds, and the call sits
on "Connecting…" until it times out. TURN relays the media in exactly that case.

The app needed no change for this: it already reads `iceServers` from
`GET /calls/:id/room` and passes them to `RTCPeerConnection`, falling back to a bare
STUN list only when the field is missing. The backend simply never sent any.

## What the server does

`GET /calls/:id/room` now returns `iceServers`, built from config by
`src/main/(shared)/calling/ice/ice.builder.ts`:

- **STUN** — always, from `STUN_URL` or the Google STUN pool.
- **TURN** — only when `TURN_URL` is set *and* a credential is configured. If TURN is
  configured without a credential it is omitted rather than advertised, because a
  relay the client cannot authenticate to just burns the ICE timeout. That
  misconfiguration is logged as a warning at boot.

Credentials are **time-limited**, not static. With `TURN_SECRET` set, the server mints:

```
username   = "<unix-expiry>:<userId>"
credential = base64(HMAC-SHA1(TURN_SECRET, username))
```

which is coturn's `use-auth-secret` scheme. The secret never leaves the VPS, no
static password ships inside the app, and every credential expires on its own
(`TURN_TTL_SECONDS`, default 4h) — so one leaking is not a permanent grant. The
identity is the caller's own `userId`, which makes relay usage traceable per user in
coturn's logs. `TURN_USERNAME`/`TURN_PASSWORD` remain as a fallback for a TURN
server that has no REST auth; prefer the secret.

## Deploying coturn

Everything is in the repo already: the service is in `docker-compose.yaml` and its
config template is `docker/coturn/turnserver.conf`.

### 1. DNS

Point a hostname at the VPS, e.g. `turn.synqulan.com` → the VPS IP. A hostname is
not required (an IP works), but it is what lets you add TLS later without
reconfiguring clients.

### 2. Secret

```bash
openssl rand -hex 32
```

Use alphanumerics/hex: the compose entrypoint substitutes it into the config with
`sed`, so a secret containing `|` or `&` would corrupt the render.

### 3. `.env` on the VPS

```bash
TURN_URL=turn:turn.synqulan.com:3478?transport=udp,turn:turn.synqulan.com:3478?transport=tcp
TURN_SECRET=<the value from step 2>
TURN_REALM=synqulan.com
```

Two entries on purpose: UDP is faster, but many corporate and some mobile networks
block it, and the TCP variant is what gets those calls through. Leave `TURN_URL`
empty to keep the previous STUN-only behaviour — that is the rollback.

### 4. Firewall

| Port | Proto | Why |
| --- | --- | --- |
| 3478 | UDP + TCP | TURN listener |
| 5349 | TCP | TURN over TLS, only if enabled below |
| 49152–65535 | UDP | relay range, one port per concurrent allocation |

```bash
sudo ufw allow 3478/udp && sudo ufw allow 3478/tcp
sudo ufw allow 49152:65535/udp
```

Also open the same ranges in the cloud provider's security group — `ufw` alone does
not help if the provider's firewall drops the traffic first.

If the VPS is behind 1:1 NAT (AWS, GCP, some OVH/Hetzner), uncomment `external-ip` in
`docker/coturn/turnserver.conf` and set it to the public IP. Otherwise coturn hands
clients a relay address they cannot reach, and calls keep failing while the logs look
healthy. Check with `ip addr` — if the public address is not on the interface, you
need this.

### 5. Start it

```bash
docker compose --profile prod up -d coturn
docker logs coturn
```

The service uses host networking deliberately: coturn must see real client addresses
and allocate relay ports on the host interface, so it cannot sit behind the compose
bridge. That makes it Linux-only.

### 6. Optional: TLS

TURN over TLS survives networks that block UDP *and* plain TCP. Uncomment
`tls-listening-port`, `cert`, and `pkey` in `docker/coturn/turnserver.conf`, mount the
certificates into the container, add a `turns:` entry to `TURN_URL`, and open 5349.
Not required to close Issue #40.

## Verifying

```bash
# 1. The relay answers on UDP. Should print a mapped address.
docker run --rm --network host coturn/coturn:4.6-alpine \
  turnutils_stunclient -p 3478 turn.synqulan.com

# 2. The API advertises TURN, with a credential, to a call participant.
curl -s -H "Authorization: Bearer <token>" \
  https://<api>/calls/<callId>/room | jq '.iceServers'
```

Expected: the STUN entries plus at least one `turn:` URL carrying `username` and
`credential`. The username starts with a Unix timestamp ~4h in the future.

```bash
# 3. End to end: call between two devices on different networks
#    (one on cellular with Wi-Fi off). Then confirm the relay was actually used.
docker logs coturn 2>&1 | grep -i alloc
```

Step 3 is the real acceptance check — steps 1 and 2 prove the plumbing, not that
media traversed the relay.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No `turn:` entries in the API response | `TURN_URL` unset, or set without a credential — check the boot warning |
| `iceServers` empty entirely | `GET /calls/:id/room` returned the `active: false` branch, which deliberately carries no credentials |
| STUN check fails | `ufw` or the provider security group is still blocking 3478 |
| Relay allocates, call still fails | `external-ip` is wrong or missing on a NAT'd VPS |
| Works on some networks, not others | Only the UDP entry is configured; add the `?transport=tcp` one |
| Calls fine until they get long | `TURN_TTL_SECONDS` shorter than the call, so an ICE restart is rejected |

## Notes

- The `active: false` branch of the room endpoint intentionally omits `iceServers`.
  It returns before the participant check, so serving credentials there would let any
  authenticated caller mint relay allocations for a call they are not part of.
- `docker/coturn/turnserver.conf` denies the private ranges including
  `169.254.169.254`. Without those rules the relay doubles as a route into the VPS's
  own network and the cloud metadata endpoint.
- Cost: relayed media is bandwidth on the VPS. Only calls that cannot connect
  directly take the TURN path — ICE prefers a direct candidate — so the volume is
  bounded by the calls that would otherwise have failed outright.
