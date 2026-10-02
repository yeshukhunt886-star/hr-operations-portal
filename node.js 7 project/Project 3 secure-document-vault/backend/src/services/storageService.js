import fs from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.resolve(
    process.env.STORAGE_ROOT || "./storage"
);

const DOCUMENTS_DIR = path.join(STORAGE_ROOT, "documents");
const TEMP_DIR = path.join(STORAGE_ROOT, "temp");

export function initializeStorage() {
    fs.mkdirSync(DOCUMENTS_DIR, {
        recursive: true
    });

    fs.mkdirSync(TEMP_DIR, {
        recursive: true
    });

    return {
        initialized: true,
        documents: fs.existsSync(DOCUMENTS_DIR),
        temp: fs.existsSync(TEMP_DIR)
    };
}

export function getDocumentStoragePath(storageName) {
    if (!storageName) {
        throw new Error("Invalid storage name");
    }

    // Never allow path traversal.
    if (
        storageName.includes("/") ||
        storageName.includes("\\") ||
        storageName.includes("..")
    ) {
        throw new Error("Invalid storage name");
    }

    const filePath = path.join(
        DOCUMENTS_DIR,
        storageName
    );

    const resolved = path.resolve(filePath);

    if (
        resolved !== DOCUMENTS_DIR &&
        !resolved.startsWith(DOCUMENTS_DIR + path.sep)
    ) {
        throw new Error("Invalid storage path");
    }

    return resolved;
}

export function createReadStream(storageName) {
    const filePath = getDocumentStoragePath(storageName);

    if (!fs.existsSync(filePath)) {
        const error = new Error("Stored file not found");
        error.code = "FILE_NOT_FOUND";
        throw error;
    }

    return fs.createReadStream(filePath);
}

export function fileExists(storageName) {
    try {
        const filePath = getDocumentStoragePath(storageName);

        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}