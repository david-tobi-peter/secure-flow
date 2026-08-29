import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

interface SpecFragment {
  paths?: Record<string, unknown>;
  schemas?: Record<string, unknown>;
}

const srcDir = join("spec", "src");
const outFile = join("spec", "openapi.json");

const base = YAML.parse(readFileSync(join(srcDir, "base.yaml"), "utf8")) as {
  components?: { schemas?: Record<string, unknown> };
} & SpecFragment;

base.paths = {};
base.components = base.components ?? {};
base.components.schemas = base.components.schemas ?? {};

const fragments = readdirSync(srcDir).filter((f) => f !== "base.yaml").sort();

for (const name of fragments) {
  const doc = YAML.parse(readFileSync(join(srcDir, name), "utf8")) as SpecFragment;
  Object.assign(base.paths, doc.paths ?? {});
  Object.assign(base.components.schemas, doc.schemas ?? {});
}

writeFileSync(outFile, `${JSON.stringify(base, null, 2)}\n`);
console.log(`Bundled ${fragments.length} spec fragment(s) into ${outFile}`);
