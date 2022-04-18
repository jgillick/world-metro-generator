import { seed } from "./seed";
import { findMetros } from "./findMetros";

export async function generate(overwriteData: boolean) {
  try {
    await seed(overwriteData);
    await findMetros();
  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    process.exit(1);
  }
}
