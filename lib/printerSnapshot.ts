export function getSnapshotUrl(printerId: string, cacheBust?: string | number) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = `${base}/storage/v1/object/public/printer-snapshots/${printerId}/latest.jpg`;
  return cacheBust ? `${url}?t=${encodeURIComponent(cacheBust)}` : url;
}

export function isSnapshotStale(lastSnapshotAt: string | null, staleAfterSeconds = 30) {
  if (!lastSnapshotAt) return true;
  const ageMs = Date.now() - new Date(lastSnapshotAt).getTime();
  return ageMs > staleAfterSeconds * 1000;
}
