import sharp from "sharp";

/**
 * Adds a semi-transparent diagonal watermark to the center of the image.
 * Returns a Promise that resolves to a data URL (webp).
 */
export async function addWatermarkToImage(imageDataUrl: string, watermarkText = "AdaptiveGIS"): Promise<string> {
  // Extract base64 from data URL
  const matches = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image data URL");
  const mimeType = matches[1];
  const base64 = matches[2];
  const imageBuffer = Buffer.from(base64, "base64");

  // Create SVG watermark overlay
  const svg = `
    <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-30 300 300)">
        <text x="50" y="300" font-size="64" font-family="Arial, sans-serif" fill="white" fill-opacity="0.28" font-weight="bold">${watermarkText}</text>
        <text x="200" y="400" font-size="64" font-family="Arial, sans-serif" fill="white" fill-opacity="0.28" font-weight="bold">${watermarkText}</text>
      </g>
    </svg>
  `;
  const svgBuffer = Buffer.from(svg);

  // Composite SVG over image
  const watermarkedBuffer = await sharp(imageBuffer)
    .composite([
      { input: svgBuffer, gravity: "center" }
    ])
    .webp({ quality: 90 })
    .toBuffer();

  return `data:image/webp;base64,${watermarkedBuffer.toString("base64")}`;
}
