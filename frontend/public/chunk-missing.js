const reloadKey = "__chunk_missing_reload_once__";

try {
  const alreadyReloaded = sessionStorage.getItem(reloadKey) === "1";

  if (!alreadyReloaded) {
    sessionStorage.setItem(reloadKey, "1");
    const url = new URL(window.location.href);
    url.searchParams.set("__chunk_reload", String(Date.now()));
    window.location.replace(url.toString());
  } else {
    console.error(
      "Chunk recovery reload already attempted once. Please hard refresh the page.",
    );
  }
} catch (error) {
  console.error("Chunk recovery fallback failed:", error);
}

// React.lazy expects a module with a default component export.
// Returning null prevents minified React error #306 when this fallback is loaded.
export default function ChunkMissingFallback() {
  return null;
}
