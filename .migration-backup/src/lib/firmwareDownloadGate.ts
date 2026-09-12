/**
 * Pure gating logic for firmware download confirmation flow.
 *
 * Used by ESP32CodeGenerator → AlertDialog so the actual
 * downloadPreparedFirmware() call is ONLY reachable when:
 *   1. The confirm dialog is open (confirmOpen === true)
 *   2. The user has ticked the "I am sure" checkbox (finalAck === true)
 *   3. A download is not already in progress (isDownloading === false)
 *
 * Any false value blocks the download path.
 */
export interface DownloadGateState {
  confirmOpen: boolean;
  finalAck: boolean;
  isDownloading: boolean;
}

export function isDownloadAllowed(state: DownloadGateState): boolean {
  return state.confirmOpen === true
    && state.finalAck === true
    && state.isDownloading === false;
}

/**
 * Guard wrapper — runs `download` only when gate allows it.
 * Returns true if download was invoked, false if blocked.
 */
export function tryDownload(
  state: DownloadGateState,
  download: () => void,
): boolean {
  if (!isDownloadAllowed(state)) return false;
  download();
  return true;
}
