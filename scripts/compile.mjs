import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";

const TOOLCHAIN =
  "/home/dell/.compact/versions/0.31.1/x86_64-unknown-linux-musl";
const LINUX_PATH = `${TOOLCHAIN}:/home/dell/.local/bin:/usr/bin:/bin`;
const SOURCE = "contracts/kompers.compact";
const TARGET = "contracts/managed/kompers";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function wsl(linuxArgs) {
  run("wsl", ["-d", "Ubuntu", "-e", "env", `PATH=${LINUX_PATH}`, ...linuxArgs]);
}

if (os.platform() === "win32") {
  wsl([`${TOOLCHAIN}/compactc.bin`, SOURCE, TARGET]);
  wsl([
    `${TOOLCHAIN}/zkir`,
    "compile-many",
    "-v",
    `${TARGET}/zkir`,
    `${TARGET}/keys`,
  ]);
} else {
  run("compactc.bin", [SOURCE, TARGET]);
  if (!existsSync(`${TARGET}/keys`)) {
    run("zkir", ["compile-many", "-v", `${TARGET}/zkir`, `${TARGET}/keys`]);
  }
}

