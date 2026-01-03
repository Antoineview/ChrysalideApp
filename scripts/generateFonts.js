#!/usr/bin/env node
/**
 * Font Generator Script
 *
 * Generates static font files from the Roboto Flex variable font
 * based on the configuration in fontConfig.json.
 *
 * Usage: npm run generate-fonts
 *
 * Requirements: fonttools must be installed (brew install fonttools)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "fontConfig.json");

function loadConfig() {
  const configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(configContent);
}

function buildFonttoolsArgs(params) {
  // Build the axis arguments for fonttools varLib.instancer
  const args = [];

  // Standard axes (lowercase)
  if (params.wght !== undefined) args.push(`wght=${params.wght}`);
  if (params.wdth !== undefined) args.push(`wdth=${params.wdth}`);
  if (params.slnt !== undefined) args.push(`slnt=${params.slnt}`);
  if (params.opsz !== undefined) args.push(`opsz=${params.opsz}`);

  // Parametric axes (uppercase)
  if (params.GRAD !== undefined) args.push(`GRAD=${params.GRAD}`);
  if (params.XOPQ !== undefined) args.push(`XOPQ=${params.XOPQ}`);
  if (params.XTRA !== undefined) args.push(`XTRA=${params.XTRA}`);
  if (params.YOPQ !== undefined) args.push(`YOPQ=${params.YOPQ}`);
  if (params.YTAS !== undefined) args.push(`YTAS=${params.YTAS}`);
  if (params.YTDE !== undefined) args.push(`YTDE=${params.YTDE}`);
  if (params.YTFI !== undefined) args.push(`YTFI=${params.YTFI}`);
  if (params.YTLC !== undefined) args.push(`YTLC=${params.YTLC}`);
  if (params.YTUC !== undefined) args.push(`YTUC=${params.YTUC}`);

  return args.join(" ");
}

function generateFont(styleName, params, sourceFont, outputDir) {
  const outputName = `RobotoFlex-${styleName.charAt(0).toUpperCase() + styleName.slice(1)}.ttf`;
  const outputPath = path.join(outputDir, outputName);
  const axisArgs = buildFonttoolsArgs(params);

  const command = `fonttools varLib.instancer "${sourceFont}" ${axisArgs} -o "${outputPath}"`;

  console.log(`\n📝 Generating ${outputName}...`);
  console.log(`   Params: ${axisArgs}`);

  try {
    execSync(command, { stdio: "pipe" });
    console.log(`   ✅ Created ${outputName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create ${outputName}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

function main() {
  console.log("🔤 Roboto Flex Font Generator\n");
  console.log("=".repeat(50));

  // Check if fonttools is installed
  try {
    execSync("which fonttools", { stdio: "pipe" });
  } catch {
    console.error("❌ Error: fonttools is not installed.");
    console.error("   Install it with: brew install fonttools");
    process.exit(1);
  }

  // Load config
  const config = loadConfig();
  const scriptDir = __dirname;
  const sourceFont = path.resolve(scriptDir, config.sourceFont);
  const outputDir = path.resolve(scriptDir, config.outputDir);

  // Check source font exists
  if (!fs.existsSync(sourceFont)) {
    console.error(`❌ Error: Source font not found: ${sourceFont}`);
    process.exit(1);
  }

  console.log(`\n📂 Source: ${sourceFont}`);
  console.log(`📂 Output: ${outputDir}`);

  // Generate each style
  const styles = Object.entries(config.styles);
  let successCount = 0;

  for (const [styleName, params] of styles) {
    if (generateFont(styleName, params, sourceFont, outputDir)) {
      successCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(
    `\n✨ Generated ${successCount}/${styles.length} fonts successfully.`
  );

  if (successCount === styles.length) {
    console.log("\n🔄 Restart Metro with: npx expo start --clear");
  }
}

main();
