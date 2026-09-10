# Kompers

**Prove you meet the bar. Keep the number private.**

Kompers is a privacy-first eligibility protocol on [Midnight](https://midnight.network). A hiring desk, lender, or DAO can post a public threshold. You prove — with a Compact ZK circuit — that a private figure meets that bar. The ledger learns a commitment and a yes/no. It never learns the number.

This repository is the Midnight Moon **Level 1 — New Moon** submission: toolchain, first Compact contract (public ledger + private witness + deliberate `disclose()`), tests, compiled circuits, Preview/Preprod deploy, and this product sketch.

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

## Level 1 scope

What this cycle ships:

- Compact contract with public ledger fields and a private witness
- `compact compile` producing `managed/` (circuits + keys)
- Passing test suite
- Deploy to Midnight **Preview** or **Preprod** with a visible contract address
- This README (idea + public vs private + local setup)
- At least 5 meaningful commits

What this cycle does **not** ship (later moons): wallet UI, issuer signatures, Merkle membership, multi-attribute policy, production key management.

---

## Repository layout

```text
kompers/
├── contracts/
│   ├── kompers.compact        # Compact source
│   └── managed/kompers/       # circuits (zkir) + keys + generated JS
├── src/                       # deploy, CLI, witnesses
├── test/                      # public vs private circuit tests
├── screenshots/               # compile + deploy evidence
├── docker-compose.yml         # proof server (Preview only needs this)
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js 22+**
- **Docker Desktop** with Compose v2 (local proof server)
- **Compact 0.31.1** — Preview still runs ledger 8; do not use 0.34.x for this deploy. On Windows, install Compact inside **WSL Ubuntu** ([toolchain guide](https://docs.midnight.network/getting-started/installation))
- Preview faucet: [https://midnight-tmnight-preview.nethermind.dev](https://midnight-tmnight-preview.nethermind.dev)

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

---

## Submission evidence

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
| 2 Waxing Crescent | Hardening | Owner-set threshold, tests for fail/pass, CLI prove flow |
| 3 First Quarter | Product surface | Wallet-connected DApp: post a bar, prove against it |
| 4 Waxing Gibbous | Real privacy | Issuer attestation + commitment/nullifier so a proof cannot be replayed |
| 5 Full Moon | Multi-attribute | Compensation AND tenure (or similar) with one disclosed result |
| 6 Supermoon | Ship | Polished UX, docs, and a demo people can actually use |

---

## License

MIT
