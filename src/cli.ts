import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { generate } from "./generate";
import { exportData } from "./export";

/**
 * Main program entry point
 */
async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName("cli")
    .command(
      "generate",
      "Generate world metros",
      (opts) => {
        opts.options({
          "overwrite-data": {
            description: "Overwrite existing data in the DB table",
            boolean: true,
          },
        });
      },
      async (argv) => {
        await generate(argv["overwriteData"] as boolean);
        process.exit(0);
      }
    )
    .command(
      "export [file]",
      "Export the data to a JSON file",
      (opts) => {
        opts.positional("file", {
          describe:
            "File to export metro data to (JS, TS, or JSON, by file extension).",
          type: "string",
          default: "export.js",
        });
      },
      async (argv) => {
        const filepath = (argv["file"] || "export.js") as string;
        await exportData(filepath);
        process.exit(0);
      }
    )
    .help()
    .alias("help", "h").argv;
}

// Force exit
const forceExit = async () => {
  console.log("Script cancelled...\b");
  process.exit(0);
};
process.on("SIGTERM", forceExit);
process.on("SIGINT", forceExit);

main();
