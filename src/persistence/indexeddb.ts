import { parseWorldSave } from "./world-save";
import type { WorldSave } from "./world-save";

const DATABASE_NAME = "gloomd-local-worlds";
const DATABASE_VERSION = 1;
const STORE_NAME = "world-saves";
const AUTOSAVE_ID = "autosave";

interface SaveRecord {
  id: string;
  save: WorldSave;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support local world saves."));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("The local save database could not be opened."));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("The local save database is busy in another browser tab. Close the other GLOOMD tab and try again."));
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
  });

  return databasePromise;
}

/** Stores one rolling autosave. The caller provides an immutable snapshot. */
export async function saveAutosave(save: WorldSave): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).put({
      id: AUTOSAVE_ID,
      save
    } satisfies SaveRecord);

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error("The world could not be saved."));
    };

    request.onerror = () => fail(request.error ?? transaction.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error ?? new Error("The save transaction was cancelled."));
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
  });
}

/** Reads and validates the most recent autosave, if one exists. */
export async function loadAutosave(): Promise<WorldSave | null> {
  const database = await openDatabase();

  return new Promise<WorldSave | null>((resolve, reject) => {
    let loaded: WorldSave | null = null;
    let requestError: unknown = null;
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(AUTOSAVE_ID);

    request.onerror = () => {
      requestError = request.error ?? new Error("The local save could not be read.");
    };
    request.onsuccess = () => {
      const record = request.result as SaveRecord | undefined;
      if (!record) {
        loaded = null;
        return;
      }
      try {
        loaded = parseWorldSave(JSON.stringify(record.save));
      } catch (error) {
        requestError = error;
      }
    };

    transaction.onerror = () => reject(requestError ?? transaction.error ?? new Error("The local save could not be read."));
    transaction.onabort = () => reject(requestError ?? transaction.error ?? new Error("The save read was cancelled."));
    transaction.oncomplete = () => {
      if (requestError) {
        reject(requestError instanceof Error ? requestError : new Error("The local save is invalid."));
      } else {
        resolve(loaded);
      }
    };
  });
}
