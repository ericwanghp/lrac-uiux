const fs = require("fs/promises");
const path = require("path");

async function removeIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function main() {
  const root = process.cwd();
  const args = new Set(process.argv.slice(2));
  const typesOnly = args.has("--types-only");

  const targets = typesOnly
    ? [path.join(root, ".next", "types"), path.join(root, ".next-build", "types")]
    : [path.join(root, ".next-build")];

  await Promise.all(targets.map(removeIfExists));
}

main().catch((error) => {
  console.error("[clean-next-artifacts] failed:", error);
  process.exit(1);
});
