export const BRIDGE_VERSION = "1.1.0";

export function getBridgeDownloadUrl() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/bridge-releases/MakerFlowBridge.exe`;
}
