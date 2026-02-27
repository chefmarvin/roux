import { Command } from "commander";
import { run } from "./app";
import { analyses } from "./analysis";

const program = new Command();

program
  .name("roux")
  .description("Mine and analyze version control data")
  .version("0.1.0");

// Shared options for all analysis subcommands
function addSharedOptions(cmd: Command): Command {
  return cmd
    .option("-l, --log <file>", "Input git log file (otherwise reads current repo)")
    .option("--repo <path>", "Git repo path to analyze")
    .option("-r, --rows <n>", "Max output rows", parseInt)
    .option("-n, --min-revs <n>", "Min revisions threshold", parseInt)
    .option("-m, --min-shared-revs <n>", "Min shared revisions", parseInt)
    .option("-i, --min-coupling <n>", "Min coupling %", parseInt)
    .option("-x, --max-coupling <n>", "Max coupling %", parseInt)
    .option("-s, --max-changeset-size <n>", "Max changeset size", parseInt);
}

// Check if stdin has data (pipe mode)
async function readStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// Register a subcommand for each analysis
for (const name of Object.keys(analyses)) {
  const cmd = program.command(name).description(`Run ${name} analysis`);
  addSharedOptions(cmd);
  cmd.action(async (opts) => {
    try {
      const input = await readStdin();
      const output = run({
        analysis: name,
        input,
        log: opts.log,
        repo: opts.repo,
        rows: opts.rows,
        minRevs: opts.minRevs,
        minSharedRevs: opts.minSharedRevs,
        minCoupling: opts.minCoupling,
        maxCoupling: opts.maxCoupling,
        maxChangesetSize: opts.maxChangesetSize,
      });
      process.stdout.write(output);
    } catch (e: unknown) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });
}

program.parse();
