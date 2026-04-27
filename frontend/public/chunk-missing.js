const reloadKey = "__chunk_missing_reload_once__";

try {
  const alreadyReloaded = sessionStorage.getItem(reloadKey) === "1";

  if (!alreadyReloaded) {
    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  } else {
    console.error(
      "Chunk recovery reload already attempted once. Please hard refresh the page.",
    );
  }
} catch (error) {
  console.error("Chunk recovery fallback failed:", error);
}

export {};
