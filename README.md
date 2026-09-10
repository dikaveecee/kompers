# Kompers

**Prove you meet the bar. Keep the number private.**

Kompers is a privacy-first eligibility protocol on [Midnight](https://midnight.network). A hiring desk, lender, or DAO can post a public threshold. You prove — with a Compact ZK circuit — that a private figure meets that bar. The ledger learns a commitment and a yes/no. It never learns the number.

This repository is the Midnight Moon **Level 2 — Waxing Crescent** submission: the Compact contract from Level 1, now wired to a browser UI with Lace on **Preprod**. The first thread of light — a circuit you can call without showing the number.

---

## Initial product idea

Kompers is a private comparison layer for compensation and eligibility. Today, proving you qualify for a role, a loan, a grant, or a DAO tier usually means oversharing: payslips, bank statements, tax forms, or a screenshot of a dashboard. That is more data than the counterparty needs, and it creates a permanent leak.

On Midnight, the private figure (current compensation, savings, contribution hours, credit-like score) stays in a **witness** on the user's machine. The circuit checks it against a **public threshold** stored on the ledger. Only two things become public, and only because we wrap them in `disclose()`: a cryptographic **commitment** to the private figure, and a boolean **qualified** result. Later levels can add issuer attestations, multi-attribute AND/OR rules, a wallet-connected DApp, and selective disclosure for compliance — still without putting the raw number on-chain.

The name is the product: **kompers** ≈ compact comparisons.

---

## Public state vs private witness

Compact is privacy-by-default. Values that come from a `witness` (or from circuit arguments) are tainted. They cannot be written to the ledger, returned from an exported circuit, or passed to another contract unless we explicitly wrap them in `disclose()`.

| Layer | What it is | In Kompers |
| --- | --- | --- |
| **Private witness** | Off-chain data the DApp supplies at proof time. Never stored on the public ledger. Used only to construct the ZK proof. | The secret figure (e.g. compensation). Also the local secret used to bind a commitment to the prover. |
| **Public ledger** | On-chain state every observer can read. | Posted threshold, last commitment, last `qualified` flag, proof counter. |
| **`disclose()`** | Compiler annotation. Does not itself publish data. It tells Compact it is intentional for a witness-derived value to cross a public boundary. | Used only at the ledger write for the commitment and the boolean result — never for the raw figure. |

**Rule we follow:** compare in-circuit, disclose the *outcome* (and a hash/commitment), never the input.

---

## Level 1 scope (complete)

What Level 1 shipped:

- Compact contract with public ledger fields and a private witness
- `compact compile` producing `managed/` (circuits + keys)
- Passing test suite
- Deploy to Midnight **Preview** with a visible contract address
- This README (idea + public vs private + local setup)
- At least 5 meaningful commits

Level 2 adds the wallet UI, Preprod, and a live demo.

---

## Repository layout

```text
kompers/
├── contracts/
│   ├── kompers.compact        # Compact source
│   └── managed/kompers/       # circuits (zkir) + keys + generated JS
├── src/                       # deploy, CLI, witnesses
├── web/                       # Vite + React DApp (Lace + circuit call)
├── test/                      # public vs private circuit tests
├── screenshots/               # compile + deploy evidence
├── docker-compose.yml         # local proof server
├── vercel.json
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js 22+**
- **Docker Desktop** with Compose v2 (local proof server)
- **Compact 0.31.1** — Preview still runs ledger 8; do not use 0.34.x for this deploy. On Windows, install Compact inside **WSL Ubuntu** ([toolchain guide](https://docs.midnight.network/getting-started/installation))
- Preview faucet: [https://midnight-tmnight-preview.nethermind.dev](https://midnight-tmnight-preview.nethermind.dev)
- Preprod faucet: [https://midnight-tmnight-preprod.nethermind.dev](https://midnight-tmnight-preprod.nethermind.dev)
- [Lace Midnight](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk) (Chrome) on network **Preprod**

---

## Setup — run locally

```bash
git clone https://github.com/dikaveecee/kompers.git
cd kompers
npm install
```

On Windows, keep Docker Desktop running. `npm run compile` shells into WSL so `compactc` / `zkir` run on Linux.

Start the Preview proof server:

```bash
npm run proof-server:start
```

Compile (you should see two circuits: `setThreshold`, `proveMeetsThreshold`):

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Deploy to **Preview**:

```bash
npm run deploy
```

The deploy script prints the **contract address**. Save a screenshot of that output for the submission.

**Preview contract address (Level 1):** `68417f23b79303d1ea1dadce6ba5af7c005100de655943dc101c48cb875c2928`

**Preprod contract address (Level 2):** deploy from the DApp (Connect Lace → Deploy new on Preprod) or:

```bash
npm run deploy:preprod
```

Then paste the 64-character address into the UI and into `web/.env` as `VITE_DEFAULT_CONTRACT`.

---

## Level 2 — browser DApp

```bash
npm run proof-server:start
npm run web:dev
```

Opens `http://localhost:3000`.

1. Connect Lace on **Preprod**. Disconnect clears the session.
2. Deploy a contract (Lace must have tDUST: Tokens → Generate tDUST) or paste a Preprod address.
3. Type a secret figure in the password field. Call `proveMeetsThreshold`.
4. The public panel updates with **qualified** yes/no, a **commitment**, and **proof count**. The figure is not there.

Writes need a local proof server on port 6300 (Docker). Reads come from the Preprod indexer and work without it.

### Live demo

Hosted on Vercel after `npm run web:build`. Set `VITE_DEFAULT_CONTRACT` to the Preprod address in the Vercel project env. Proving from the hosted URL still needs a proof server on the machine running the browser (`http://127.0.0.1:6300`) unless Lace supplies `proverServerUri`.

---

## Privacy claim (Level 2)

**What is proven:** the private figure is greater than or equal to the public `threshold`.

**What is shown:** `lastQualified` (boolean), `lastCommitment` (32-byte hiding commitment), `proofCount`, and the threshold itself.

**What is never shown:** the secret figure. It is a Compact `witness`. The circuit compares it in-circuit. `disclose()` is used only for the boolean and the commitment — see `contracts/kompers.compact`. The UI stores the figure in in-memory private state for one proof, then clears the password field. The public ledger hook reads the indexer and has no field named `figure`.

That is the observable privacy behavior: a third party can verify that *someone* met the bar, and cannot recover the number from chain data.

---

## Level 2 submission evidence

| Requirement | Where |
| --- | --- |
| Public GitHub repo + README | this repository |
| Live demo | Vercel URL (set after first Preprod deploy) |
| Preprod contract address | this README + DApp header |
| Lace connect / disconnect | `web/src/App.tsx` |
| Circuit called from the frontend | `proveMeetsThreshold` in `web/src/App.tsx` |
| Observable privacy | public ledger panel vs password witness; [privacy claim](#privacy-claim-level-2) |
| Demo video | wallet connect + successful circuit call (recorded by submitter) |
| 8+ meaningful commits | git history for this cycle |

---

## Level 1 submission evidence

| Requirement | Where |
| --- | --- |
| Public GitHub repo + README | this repository |
| Setup instructions | [Setup — run locally](#setup--run-locally) |
| Screenshot: compile (circuits listed) | `screenshots/compile.png` |
| Screenshot: deployed address | `screenshots/deploy-output.txt` (screenshot as `screenshots/deploy.png`) |
| Public state vs private witness | [section above](#public-state-vs-private-witness) |
| Initial product idea | [section above](#initial-product-idea) |
| 5+ meaningful commits | git history |

---

## Roadmap (later moons)

| Level | Theme | Kompers increment |
| --- | --- | --- |
| 2 Waxing Crescent | Face | Lace + frontend circuit call on Preprod — this cycle |
| 3 First Quarter | Product surface | Owner-set threshold in UI, fail/pass copy, better local private state |
| 4 Waxing Gibbous | Real privacy | Issuer attestation + commitment/nullifier so a proof cannot be replayed |
| 5 Full Moon | Multi-attribute | Compensation AND tenure (or similar) with one disclosed result |
| 6 Supermoon | Ship | Polished UX, docs, and a demo people can actually use |

---

## License

MIT
