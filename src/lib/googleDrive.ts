const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_STORAGE_KEY = "gdrive_access_token";

interface StoredToken {
  token: string;
  expiresAt: number;
}

export interface DriveFolder {
  id?: string;
  name: string;
}

interface PickerDocument {
  id?: string;
  name?: string;
}

interface PickerResponse {
  action?: string;
  docs?: PickerDocument[];
}

interface PickerInstance {
  setVisible: (visible: boolean) => void;
}

interface PickerDocsView {
  setSelectFolderEnabled: (enabled: boolean) => PickerDocsView;
  setIncludeFolders: (enabled: boolean) => PickerDocsView;
  setOwnedByMe: (owned: boolean) => PickerDocsView;
  setParent: (parentId: string) => PickerDocsView;
}

interface PickerBuilderInstance {
  addView: (view: PickerDocsView) => PickerBuilderInstance;
  setOAuthToken: (token: string) => PickerBuilderInstance;
  setDeveloperKey: (key: string) => PickerBuilderInstance;
  setTitle: (title: string) => PickerBuilderInstance;
  setCallback: (callback: (data: PickerResponse) => void) => PickerBuilderInstance;
  build: () => PickerInstance;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        Feature: { NAV_HIDDEN: string };
        ViewId: { FOLDERS: string };
        DocsView: new (viewId: string) => PickerDocsView;
        PickerBuilder: new () => PickerBuilderInstance;
      };
    };
    gapi?: {
      load: (api: string, callback: () => void) => void;
    };
  }
}

const getClientId = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  }
  return clientId;
};

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Missing VITE_GOOGLE_API_KEY");
  }
  return apiKey;
};

const loadGoogleIdentityScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
};

const loadGoogleApiScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://apis.google.com/js/api.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google API script")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google API script"));
    document.head.appendChild(script);
  });
};

const ensurePickerReady = async () => {
  await loadGoogleApiScript();
  if (!window.gapi) {
    throw new Error("Google API script not available");
  }
  await new Promise<void>((resolve) => {
    window.gapi?.load("picker", () => resolve());
  });
};

const storeToken = (token: string, expiresInSeconds = 3600) => {
  const expiresAt = Date.now() + expiresInSeconds * 1000 - 30_000;
  const payload: StoredToken = { token, expiresAt };
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
};

const getStoredToken = (): StoredToken | null => {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch (error) {
    console.warn("Failed to parse stored token", error);
    return null;
  }
};

export const clearStoredToken = () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const ensureDriveAccessToken = async () => {
  const stored = getStoredToken();
  if (stored && stored.expiresAt > Date.now()) {
    return stored.token;
  }

  await loadGoogleIdentityScript();

  const clientId = getClientId();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error("No access token received"));
          return;
        }
        storeToken(response.access_token, response.expires_in);
        resolve(response.access_token);
      },
    });

    if (!tokenClient) {
      reject(new Error("Google Identity Services unavailable"));
      return;
    }

    tokenClient.requestAccessToken({ prompt: stored ? "" : "consent" });
  });
};

const createFolder = async (accessToken: string, name: string, parentId?: string) => {
  const response = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive folder creation failed: ${errorText}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
};

export const createDriveFolder = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFolder> => {
  const id = await createFolder(accessToken, name, parentId);
  return { id, name };
};

const uploadMultipartFile = async (
  accessToken: string,
  params: { name: string; mimeType: string; data: Blob; parentId?: string }
) => {
  const boundary = "-------314159265358979323846";
  const metadata = {
    name: params.name,
    mimeType: params.mimeType,
    parents: params.parentId ? [params.parentId] : undefined,
  };

  const body = new Blob([
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      "\r\n",
    `--${boundary}\r\n` + `Content-Type: ${params.mimeType}\r\n\r\n`,
    params.data,
    `\r\n--${boundary}--`,
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive upload failed: ${errorText}`);
  }
};

export const uploadFileToDrive = async (
  accessToken: string,
  params: { name: string; mimeType: string; data: Blob; parentId?: string }
) => {
  await uploadMultipartFile(accessToken, params);
};

export const uploadZipToDrive = async (
  accessToken: string,
  fileName: string,
  zipBlob: Blob,
  parentId?: string
) => {
  await uploadMultipartFile(accessToken, {
    name: fileName,
    mimeType: "application/zip",
    data: zipBlob,
    parentId,
  });
};

export const uploadFolderToDrive = async (
  accessToken: string,
  folderName: string,
  files: Array<{ name: string; blob: Blob }>,
  parentId?: string
) => {
  const folderId = await createFolder(accessToken, folderName, parentId);
  for (const file of files) {
    await uploadMultipartFile(accessToken, {
      name: file.name,
      mimeType: "image/png",
      data: file.blob,
      parentId: folderId,
    });
  }
};

export const pickDriveFolder = async (accessToken: string): Promise<DriveFolder> => {
  await ensurePickerReady();
  const apiKey = getApiKey();

  return new Promise<DriveFolder>((resolve, reject) => {
    const view = new window.google!.picker!.DocsView(
      window.google!.picker!.ViewId.FOLDERS
    )
      .setParent("root")
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setOwnedByMe(true);

    const picker = new window.google!.picker!.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setTitle("Select a Drive folder")
      .setCallback((data) => {
        if (data.action === window.google!.picker!.Action.PICKED) {
          const doc = data.docs?.[0];
          if (!doc?.id) {
            reject(new Error("No folder selected"));
            return;
          }
          resolve({ id: doc.id, name: doc.name || "Drive folder" });
        } else if (data.action === window.google!.picker!.Action.CANCEL) {
          reject(new Error("Picker cancelled"));
        }
      })
      .build();

    picker.setVisible(true);
  });
};
