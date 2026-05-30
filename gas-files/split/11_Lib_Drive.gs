/**
 * Lib_Drive.gs — Drive(画像)アップロード
 */

function uploadDataUrlToDrive(dataUrl, filename, subFolderName) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mimeType = match[1];
  const base64 = match[2];

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    mimeType,
    filename
  );

  const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const yearFolder = getOrCreateSubFolder(rootFolder, String(new Date().getFullYear()) + '年');
  const targetFolder = getOrCreateSubFolder(yearFolder, subFolderName);

  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { url: file.getUrl(), file_id: file.getId() };
}

function getOrCreateSubFolder(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

function formatDateForFile(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────
// Step 1 / Step 2 で追加された API
// ─────────────────────────────────────────
