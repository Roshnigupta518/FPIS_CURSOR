/**
 * File download / save helpers.
 *
 *   saveBase64ToDevice({base64, fileName, mimeType})
 *     → Promise<{path, displayLocation, openable}>
 *
 *   openSavedFile({path, mimeType})
 *     → Promise<void>
 *
 *   ensureStoragePermission()
 *     → Promise<boolean>
 *
 * Persists a base64 payload as a real file on the user's device:
 *   - Android: writes into the public **Downloads** folder so the file
 *     appears in the system Files / Downloads app. Older Androids
 *     (API ≤ 28) need WRITE_EXTERNAL_STORAGE; we ask once at runtime.
 *     We also register the file with the system DownloadManager so a
 *     completed-download notification surfaces in the status bar.
 *   - iOS: writes into the app's Documents directory (visible in the
 *     Files app under "On My iPhone → FamilyWelfareApp"). iOS doesn't
 *     expose a global Downloads folder.
 *
 * Designed to be reused by any screen that wants the same "save to
 * device" UX (My Report today; could be receipts / invoices later).
 */

import {PermissionsAndroid, Platform} from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

/* -------------------------------------------------------------------------- */
/*  Android permission                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Android 13+ (API 33) doesn't grant WRITE_EXTERNAL_STORAGE anymore;
 * scoped storage handles it via DownloadManager. Android 10–12 also
 * tolerates writes to the public Downloads dir without the permission.
 *
 * So we only prompt on Android ≤ 28 (Android 9), where the legacy file
 * API is what actually persists the bytes.
 */
export const ensureStoragePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  if ((Platform.Version || 0) > 28) {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage permission',
        message: 'Allow saving the report to your device Downloads folder.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_e) {
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/*  Save                                                                       */
/* -------------------------------------------------------------------------- */

const sanitizeFileName = name => {
  const fallback = `download_${Date.now()}.bin`;
  if (!name || typeof name !== 'string') {
    return fallback;
  }
  // Strip path separators + ASCII control bytes; keep extension if present.
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim() || fallback;
};

const buildTargetPath = fileName => {
  const safe = sanitizeFileName(fileName);
  if (Platform.OS === 'android') {
    return `${RNBlobUtil.fs.dirs.DownloadDir}/${safe}`;
  }
  return `${RNBlobUtil.fs.dirs.DocumentDir}/${safe}`;
};

/**
 * Writes the base64 payload to disk and (on Android) registers the
 * resulting file with the system DownloadManager so it appears under
 * Downloads in the Files app.
 *
 * Resolves with:
 *   - path             absolute filesystem path
 *   - displayLocation  human-readable label for toasts ("Downloads"
 *                      on Android, "Files → On My iPhone" on iOS)
 *   - openable         whether the device can hand the file to a
 *                      viewer when openSavedFile() is called
 */
export const saveBase64ToDevice = async ({base64, fileName, mimeType}) => {
  if (!base64) {
    throw new Error('No file data provided');
  }

  const ok = await ensureStoragePermission();
  if (!ok) {
    const err = new Error('Storage permission denied');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const path = buildTargetPath(fileName);
  await RNBlobUtil.fs.writeFile(path, base64, 'base64');

  // Register with Android's DownloadManager so the OS shows a
  // "Download complete" notification + lists the file in Downloads.
  if (Platform.OS === 'android' && RNBlobUtil.android?.addCompleteDownload) {
    try {
      await RNBlobUtil.android.addCompleteDownload({
        title: fileName,
        description: fileName,
        mime: mimeType || 'application/octet-stream',
        path,
        showNotification: true,
      });
    } catch (_e) {
      /* best-effort — file is still on disk if this fails */
    }
  }

  return {
    path,
    displayLocation:
      Platform.OS === 'android'
        ? 'Downloads'
        : 'Files → On My iPhone → FamilyWelfareApp',
    openable: true,
  };
};

/* -------------------------------------------------------------------------- */
/*  Open                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Hands the saved file to the OS so it opens in whatever app the user
 * has installed for that mime-type (Excel, Numbers, WPS, etc.). On iOS
 * this surfaces the document preview controller (which has its own
 * share button so the user can still re-export).
 */
export const openSavedFile = async ({path, mimeType}) => {
  if (!path) {
    throw new Error('No file to open');
  }

  if (Platform.OS === 'android') {
    if (!RNBlobUtil.android?.actionViewIntent) {
      throw new Error('Cannot open file on this device');
    }
    await RNBlobUtil.android.actionViewIntent(
      path,
      mimeType || 'application/octet-stream',
    );
    return;
  }

  // iOS: previewDocument falls back to a doc-preview controller, which
  // is the most consistent way to open arbitrary file types.
  if (RNBlobUtil.ios?.previewDocument) {
    RNBlobUtil.ios.previewDocument(path);
    return;
  }
  if (RNBlobUtil.ios?.openDocument) {
    RNBlobUtil.ios.openDocument(path);
    return;
  }
  throw new Error('Cannot open file on this device');
};
