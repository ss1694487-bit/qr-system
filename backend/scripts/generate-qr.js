import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const [slug, publicBaseUrl] = process.argv.slice(2);

if (!slug || !publicBaseUrl) {
  console.error("Usage: npm run qr -- <client-slug> <public-frontend-url>");
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Slug must contain lowercase letters, numbers and hyphens only.");
  process.exit(1);
}

const configPath = path.join(backendDir, "data", "clients", `${slug}.json`);
try {
  const client = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (client.slug !== slug || !client.businessName || !client.reviewUrl ||
      client.reviewUrl.includes("REPLACE_WITH_REAL")) {
    throw new Error("Client configuration is incomplete. Check businessName and reviewUrl.");
  }
} catch (error) {
  console.error(`Cannot generate QR: ${error.message}`);
  process.exit(1);
}

const base = new URL(publicBaseUrl);
if (base.protocol !== "https:" && base.hostname !== "localhost") {
  console.error("Use an HTTPS public website URL (localhost is allowed for testing).");
  process.exit(1);
}

const target = new URL(`/r/${slug}`, base).toString();
const outputDir = path.join(backendDir, "generated-qr");
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, `${slug}.png`);

await QRCode.toFile(output, target, {
  type: "png",
  width: 1200,
  margin: 3,
  errorCorrectionLevel: "H",
  color: { dark: "#080808", light: "#FFFFFF" }
});

console.log(`QR created: ${output}`);
console.log(`Customer URL: ${target}`);
