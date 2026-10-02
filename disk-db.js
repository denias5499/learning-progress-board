/**
 * disk-db.js — v2.2.0
 * ============================================================
 * Learning Progress Board — Disk Database Layer
 *
 * v2.1.0 重大改動：
 *   1. 移除 OPFS (browser-internal, 用戶看不到)
 *   2. 新增 File System Access API 整合 (showDirectoryPicker)
 *   3. JSON 檔案儲存在用戶指定的 Mac 資料夾 (iCloud/Dropbox/NAS 自動 sync)
 *   4. Folder handle 持久化到 IndexedDB (Chrome/Edge)
 *   5. 權限檢查 + popup UX (權限被拒時彈出重選提示)
 *   6. setup() 自動偵測 stored handle → 自動 re-authorize
 *
 * 跨瀏覽器支援：
 *   - Chrome / Edge 86+: 完整 File System Access API
 *   - Safari / Firefox: 不支援 showDirectoryPicker，僅用 IndexedDB (local cache)
 *     並提供 exportToDownload() 手動備份
 *
 * 用法：
 *   await window.diskDB.setup({ userId: 'config' })  // 完整初始化
 *   await window.diskDB.pickFolder()                  // 讓用戶選 folder
 *   await window.diskDB.syncAllToFolder()             // 寫 JSON 到 folder
 *   await window.diskDB.syncAllFromFolder()           // 從 folder 讀 JSON
 * ============================================================
 */

(function() {
    'use strict';

    const DB_NAME = 'LearningProgressDB';
    const DB_VERSION = 4; // v2.1.0: + folder handle store
    const STORAGE_KEY_FAMILY = 'StudyMap_Family_Data_V20';
    const DB_FOLDER_NAME = 'StudyMap_DB';
    const FOLDER_HANDLE_KEY = 'folder_handle';
    const FOLDER_INFO_KEY = 'folder_info';

    // ============================================================
    // Schema 定義 — 12 個 stores 涵蓋所有功能
    // ============================================================
    const SCHEMA = {
        // 1. 使用者
        users: {
            keyPath: 'id',
            indexes: { name: 'name' }
        },
        // 2. 進度大分類 (會考複習 / 段考複習)
        categories: {
            keyPath: 'id',
            indexes: { userId: 'userId' }
        },
        // 3. 任務/專案 (一模 / 二模 / 暑假複習進度)
        projects: {
            keyPath: 'id',
            indexes: { categoryId: 'categoryId' }
        },
        // 4. 教材科目 (國文 / 英文 / 數學)
        subjects: {
            keyPath: 'id',
            indexes: { projectId: 'projectId', name: 'name' }
        },
        // 5. 教材類型 (複習講義 / 模擬試題)
        materialTypes: {
            keyPath: 'id',
            indexes: { subjectId: 'subjectId', name: 'name' }
        },
        // 6. Instance 教材名 (勝經 / 麻辣甲 / 大滿貫甲)
        instances: {
            keyPath: 'id',
            indexes: { materialTypeId: 'materialTypeId', name: 'name' }
        },
        // 7. 冊 (vol)
        vols: {
            keyPath: 'id',
            indexes: { instanceId: 'instanceId', name: 'name' }
        },
        // 8. 單元 — COMPOSITE KEY (typeName, instanceName, vol, unitName)
        //    vol 是 KEY 的一部分，杜絕「少一個 vol」的問題
        units: {
            keyPath: ['typeName', 'instanceName', 'vol', 'unitName'],
            indexes: {
                '_legacyUnitId': '_legacyUnitId',
                'subject': 'subject',
                'vol': 'vol',
                'typeInstance': ['typeName', 'instanceName']
            }
        },
        // 9. 任務記錄
        tasks: {
            keyPath: 'id',
            indexes: {
                'date': 'date',
                'unitKey': ['typeName', 'instanceName', 'vol', 'unitName'],
                'isDone': 'isDone',
                'planId': 'planId',
                'subject': 'subject'
            }
        },
        // 10. 計畫/排程
        plans: {
            keyPath: 'id',
            indexes: { userId: 'userId' }
        },
        // 11. 答對率
        accuracy: {
            keyPath: 'id',
            autoIncrement: true,
            indexes: {
                'unitKey': ['typeName', 'instanceName', 'vol', 'unitName'],
                'date': 'date'
            }
        },
        // 12. 中介資料 (folder handle、currentUserId 等)
        meta: {
            keyPath: 'key'
        }
    };

    // ============================================================
    // FSAccess — File System Access API helpers
    // 取代 v2.0.0 的 OPFS。讓用戶選 Mac 資料夾 (iCloud/Dropbox/NAS 同步)
    // ============================================================
    const FSAccess = {
        /**
         * 檢查瀏覽器是否支援
         */
        isSupported() {
            return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
        },

        /**
         * 彈出原生 picker 讓用戶選資料夾
         */
        async pickFolder() {
            if (!this.isSupported()) {
                throw new Error('瀏覽器不支援 File System Access API。請用 Chrome 或 Edge。');
            }
            return await window.showDirectoryPicker({
                mode: 'readwrite',
                id: 'studymap-db'
            });
        },

        /**
         * 檢查/請求 handle 權限
         */
        async ensurePermission(handle, mode = 'readwrite') {
            if (!handle) return false;
            const opts = { mode };
            try {
                const cur = await handle.queryPermission(opts);
                if (cur === 'granted') return true;
            } catch (e) {
                return false;
            }
            try {
                const req = await handle.requestPermission(opts);
                return req === 'granted';
            } catch (e) {
                return false;
            }
        },

        /**
         * 寫 JSON 檔案到 directory handle
         */
        async writeJsonFile(dirHandle, fileName, data) {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            const content = JSON.stringify(data, null, 2);
            await writable.write(content);
            await writable.close();
            return { file: fileName, size: content.length };
        },

        /**
         * 從 directory handle 讀 JSON 檔案 (不存在回傳 null)
         */
        async readJsonFile(dirHandle, fileName) {
            try {
                const fileHandle = await dirHandle.getFileHandle(fileName, { create: false });
                const file = await fileHandle.getFile();
                return JSON.parse(await file.text());
            } catch (e) {
                if (e.name === 'NotFoundError') return null;
                throw e;
            }
        },

        /**
         * 列出資料夾內所有 .json 檔案名
         */
        async listJsonFiles(dirHandle) {
            const files = [];
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    files.push(entry.name);
                }
            }
            return files;
        },

        /**
         * 刪除檔案 (容錯)
         */
        async deleteFile(dirHandle, fileName) {
            try {
                await dirHandle.removeEntry(fileName);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    // ============================================================
    // Downloader — fallback for non-FSAccess browsers (Safari, Firefox)
    // 把檔案下載到使用者系統 Downloads 資料夾
    // ============================================================
    const Downloader = {
        downloadJson(storeName, items) {
            const data = {
                store: storeName,
                count: Array.isArray(items) ? items.length : 0,
                updatedAt: new Date().toISOString(),
                items: items || []
            };
            const filename = storeName + '.json';
            const content = JSON.stringify(data, null, 2);
            return Promise.resolve(this.downloadFile(filename, content)).then(() => filename);
        },

        downloadFile(filename, content, mimeType = 'application/json') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return { filename, size: blob.size };
        },

        downloadFiles(files) {
            return files.map(f => this.downloadFile(f.name, f.content, f.mimeType));
        }
    };

    // ============================================================
    // LearningProgressDB Class
    // ============================================================
    class LearningProgressDB {
        constructor() {
            this.dbName = DB_NAME;
            this.version = DB_VERSION;
            this.db = null;
            this.setupLog = [];
            this._activeFolderHandle = null;
        }

        async init() {
            if (this.db) return this;
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    const oldV = e.oldVersion;
                    console.log('[diskDB] upgrade: ' + oldV + ' -> ' + this.version);

                    Object.entries(SCHEMA).forEach(([storeName, config]) => {
                        let store;
                        const opts = { keyPath: config.keyPath };
                        if (config.autoIncrement) opts.autoIncrement = true;

                        if (db.objectStoreNames.contains(storeName)) {
                            store = e.target.transaction.objectStore(storeName);
                        } else {
                            store = db.createObjectStore(storeName, opts);
                        }

                        if (config.indexes) {
                            Object.entries(config.indexes).forEach(([indexName, keyPath]) => {
                                if (!store.indexNames.contains(indexName)) {
                                    store.createIndex(indexName, keyPath, { unique: false });
                                }
                            });
                        }
                    });
                };

                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    console.log('[diskDB] connection opened, version', this.version);
                    resolve(this);
                };

                request.onerror = (e) => {
                    console.error('[diskDB] connection failed:', e.target.error);
                    reject(e.target.error);
                };

                request.onblocked = (e) => {
                    console.warn('[diskDB] connection blocked (close other tabs?)');
                };
            });
        }

        async _tx(storeName, mode) {
            if (!this.db) await this.init();
            return this.db.transaction(storeName, mode).objectStore(storeName);
        }

        async get(storeName, key) {
            const store = await this._tx(storeName, 'readonly');
            return new Promise((resolve, reject) => {
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async put(storeName, value) {
            const store = await this._tx(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.put(value);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async getAll(storeName) {
            const store = await this._tx(storeName, 'readonly');
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async getByIndex(storeName, indexName, value) {
            const store = await this._tx(storeName, 'readonly');
            const idx = store.index(indexName);
            return new Promise((resolve, reject) => {
                const req = idx.getAll(value);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async delete(storeName, key) {
            const store = await this._tx(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        async clear(storeName) {
            const store = await this._tx(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        async bulkPut(storeName, items) {
            if (!items || items.length === 0) return;
            const store = await this._tx(storeName, 'readwrite');
            return new Promise((resolve, reject) => {
                const tx = store.transaction;
                items.forEach(item => store.put(item));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }

        async count(storeName) {
            const store = await this._tx(storeName, 'readonly');
            return new Promise((resolve, reject) => {
                const req = store.count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        close() {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
        }

        // ============================================================
        // Folder Handle 管理 (File System Access API)
        // ============================================================

        /**
         * 從 IndexedDB 取得 stored folder handle (Chrome/Edge 支援)
         * 並嘗試取得 readwrite 權限
         */
        async tryStoredHandle() {
            const r = await this.get('meta', FOLDER_HANDLE_KEY);
            if (!r) return null;
            const handle = (r.value && r.value.handle) || r.handle;
            if (!handle) return null;
            try {
                if (await FSAccess.ensurePermission(handle, 'readwrite')) {
                    return handle;
                }
            } catch (e) {
                console.warn('[diskDB] stored handle invalid:', e.message);
            }
            return null;
        }

        /**
         * 儲存 folder handle 到 IndexedDB (Chrome/Edge)
         */
        async storeHandle(handle) {
            if (!handle) return;
            await this.setMeta(FOLDER_HANDLE_KEY, {
                handle,
                name: handle.name,
                savedAt: Date.now()
            });
            this._activeFolderHandle = handle;
        }

        /**
         * 取得 folder 元資料 (name, savedAt)
         */
        async getFolderInfo() {
            const r = await this.get('meta', FOLDER_INFO_KEY);
            return r ? (r.value || r) : null;
        }

        async saveFolderInfo(handle) {
            if (!handle) return;
            await this.setMeta(FOLDER_INFO_KEY, {
                name: handle.name,
                savedAt: Date.now()
            });
        }

        /**
         * 取得當前 session 的 folder handle
         */
        getActiveHandle() {
            return this._activeFolderHandle;
        }

        // ============================================================
        // Sync — IndexedDB <-> JSON files in folder
        // ============================================================

        async syncAllToFolder(folderHandle) {
            const result = { written: 0, errors: [], files: [] };
            if (!folderHandle) {
                result.errors.push({ error: 'no_handle' });
                return result;
            }
            for (const storeName of Object.keys(SCHEMA)) {
                try {
                    const items = await this.getAll(storeName);
                    const fileRes = await FSAccess.writeJsonFile(folderHandle, storeName + '.json', {
                        store: storeName,
                        count: items.length,
                        updatedAt: new Date().toISOString(),
                        items
                    });
                    result.written++;
                    result.files.push(fileRes);
                } catch (e) {
                    result.errors.push({ store: storeName, error: e.message });
                }
            }
            return result;
        }

        async syncAllFromFolder(folderHandle) {
            const result = { loaded: 0, errors: [] };
            if (!folderHandle) {
                result.errors.push({ error: 'no_handle' });
                return result;
            }
            for (const storeName of Object.keys(SCHEMA)) {
                try {
                    const data = await FSAccess.readJsonFile(folderHandle, storeName + '.json');
                    if (!data) continue;
                    if (!Array.isArray(data.items)) continue;
                    await this.clear(storeName);
                    if (data.items.length > 0) {
                        await this.bulkPut(storeName, data.items);
                    }
                    result.loaded++;
                } catch (e) {
                    result.errors.push({ store: storeName, error: e.message });
                }
            }
            return result;
        }

        async syncOneToFolder(folderHandle, storeName) {
            if (!folderHandle) return null;
            const items = await this.getAll(storeName);
            return FSAccess.writeJsonFile(folderHandle, storeName + '.json', {
                store: storeName,
                count: items.length,
                updatedAt: new Date().toISOString(),
                items
            });
        }

        async writeManifest(folderHandle, extra = {}) {
            const stats = await this.getStats();
            const manifest = {
                version: '2.1.0',
                dbVersion: this.version,
                timestamp: new Date().toISOString(),
                stats,
                schema: Object.keys(SCHEMA),
                ...extra
            };
            return FSAccess.writeJsonFile(folderHandle, 'MANIFEST.json', manifest);
        }

        // ============================================================
        // v2.2.0 — Hybrid Sync API (manual + auto + page-unload)
        // ============================================================

        /**
         * 同步單一 store 到 disk (Chrome/Edge 直接寫, Safari 觸發下載)
         */
        async syncStoreToDisk(storeName) {
            const handle = await this.tryStoredHandle();
            if (handle) {
                // Chrome/Edge: 直接寫 folder
                return this.syncOneToFolder(handle, storeName);
            } else {
                // Safari/Firefox: 觸發單檔下載
                const items = await this.getAll(storeName);
                return Downloader.downloadJson(storeName, items);
            }
        }

        /**
         * 同步所有 stores 到 disk
         * @returns {{written: number, mode: 'folder'|'download', files: string[], errors: Array}}
         */
        async syncAllToDisk() {
            const handle = await this.tryStoredHandle();
            if (handle) {
                // Chrome/Edge 路徑: 寫 folder
                const result = await this.syncAllToFolder(handle);
                await this.writeManifest(handle);
                return { ...result, mode: 'folder' };
            } else {
                // Safari/Firefox 路徑: 13 個檔案下載對話框
                const stats = await this.getStats();
                const files = [];
                const errors = [];
                for (const storeName of Object.keys(SCHEMA)) {
                    try {
                        const items = await this.getAll(storeName);
                        const fname = Downloader.downloadJson(storeName, items);
                        files.push(fname);
                        // 小延遲避免瀏覽器擋多檔下載
                        await new Promise(r => setTimeout(r, 100));
                    } catch (e) {
                        errors.push({ store: storeName, error: e.message });
                    }
                }
                // Manifest 最後一個
                const manifestName = Downloader.downloadJson('MANIFEST', {
                    version: '2.2.0',
                    dbVersion: this.version,
                    timestamp: new Date().toISOString(),
                    stats,
                    schema: Object.keys(SCHEMA),
                    mode: 'manual_download'
                });
                files.push(manifestName);
                return { written: files.length, mode: 'download', files, errors };
            }
        }

        /**
         * 從 disk folder 載入 JSON 到 IndexedDB (Chrome/Edge)
         */
        async loadFromDiskFolder() {
            const handle = await this.tryStoredHandle();
            if (!handle) {
                throw new Error('No stored folder handle. Pick a folder first.');
            }
            return this.syncAllFromFolder(handle);
        }

        /**
         * 從用戶選的 files (Safari/Firefox 用 input[type=file][webkitdirectory]) 載入
         * @param {FileList|Array<File>} files
         */
        async loadFromJsonFiles(files) {
            const result = { loaded: 0, errors: [], stores: [] };
            const fileArr = Array.from(files);

            for (const file of fileArr) {
                if (!file.name.endsWith('.json')) continue;
                const storeName = file.name.replace(/\.json$/, '');
                if (storeName === 'MANIFEST') continue;
                if (!SCHEMA[storeName]) {
                    result.errors.push({ file: file.name, error: 'unknown_store' });
                    continue;
                }
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (!Array.isArray(data.items)) {
                        result.errors.push({ file: file.name, error: 'invalid_format' });
                        continue;
                    }
                    await this.clear(storeName);
                    if (data.items.length > 0) {
                        await this.bulkPut(storeName, data.items);
                    }
                    result.loaded++;
                    result.stores.push({ store: storeName, count: data.items.length });
                } catch (e) {
                    result.errors.push({ file: file.name, error: e.message });
                }
            }
            return result;
        }

        /**
         * 設定自動 sync (每 30 秒背景)
         * @param {number} intervalMs 預設 30000
         * @returns {{stop: Function}}
         */
        setupAutoSync(intervalMs = 30000) {
            if (this._autoSyncInterval) {
                clearInterval(this._autoSyncInterval);
            }
            const tick = async () => {
                try {
                    const handle = await this.tryStoredHandle();
                    if (!handle) return; // 沒綁 folder, 不做事
                    const result = await this.syncAllToFolder(handle);
                    await this.writeManifest(handle);
                    console.log('[diskDB.autoSync] written', result.written, 'files');
                } catch (e) {
                    console.warn('[diskDB.autoSync] error:', e.message);
                }
            };
            this._autoSyncInterval = setInterval(tick, intervalMs);
            console.log('[diskDB] auto-sync started, interval =', intervalMs, 'ms');
            return {
                stop: () => {
                    if (this._autoSyncInterval) {
                        clearInterval(this._autoSyncInterval);
                        this._autoSyncInterval = null;
                        console.log('[diskDB] auto-sync stopped');
                    }
                }
            };
        }

        /**
         * 頁面離開前 sync (Safari 不可靠, Chrome/Edge OK)
         */
        setupUnloadSync() {
            const handler = () => {
                // 同步觸發, 瀏覽器會 block async, 但 initiated 會跑
                this.tryStoredHandle().then(handle => {
                    if (handle) {
                        this.syncAllToFolder(handle).catch(() => {});
                    }
                }).catch(() => {});
            };
            window.addEventListener('beforeunload', handler);
            window.addEventListener('pagehide', handler);
            console.log('[diskDB] unload-sync listener installed');
        }

        // ============================================================
        // Setup 程序 (v2.1.0 — File System Access API)
        // ============================================================
        async setup(options = {}) {
            const userId = options.userId || 'config';
            const log = [];
            const startedAt = Date.now();

            console.log('[diskDB.setup] v2.1.0 開始 setup 程序...');
            log.push({ step: 'start', timestamp: startedAt, version: '2.1.0' });

            // Step 1: 初始化 IndexedDB
            try {
                await this.init();
                log.push({ step: 'init_db', status: 'ok', version: this.version });
            } catch (e) {
                log.push({ step: 'init_db', status: 'error', error: e.message });
                throw e;
            }

            // Step 2: 取得 folder handle
            let folderHandle = options.folderHandle || null;
            let folderName = null;
            let folderSource = null;

            if (folderHandle) {
                folderName = folderHandle.name;
                folderSource = 'options';
                this._activeFolderHandle = folderHandle;
                log.push({ step: 'folder_from_options', status: 'ok', folderName });
            } else if (options.tryStored !== false) {
                folderHandle = await this.tryStoredHandle();
                if (folderHandle) {
                    folderName = folderHandle.name;
                    folderSource = 'stored';
                    this._activeFolderHandle = folderHandle;
                    log.push({ step: 'try_stored_handle', status: 'ok', folderName });
                }
            }

            if (!folderHandle && options.pickIfMissing !== false) {
                if (FSAccess.isSupported()) {
                    try {
                        folderHandle = await FSAccess.pickFolder();
                        folderName = folderHandle.name;
                        folderSource = 'picker';
                        this._activeFolderHandle = folderHandle;
                        await this.storeHandle(folderHandle);
                        log.push({ step: 'pick_folder', status: 'ok', folderName });
                    } catch (e) {
                        if (e.name === 'AbortError') {
                            log.push({ step: 'pick_folder', status: 'cancelled' });
                        } else {
                            log.push({ step: 'pick_folder', status: 'error', error: e.message });
                        }
                    }
                } else {
                    log.push({
                        step: 'pick_folder',
                        status: 'unsupported',
                        reason: 'File System Access API not available (use Chrome/Edge)'
                    });
                }
            }

            // Step 3: 自動遷移
            let migration = null;
            if (options.migrate !== false) {
                try {
                    migration = await this.migrateFromLocalStorage(userId);
                    log.push({ step: 'migrate', status: 'ok', migration });
                } catch (e) {
                    log.push({ step: 'migrate', status: 'error', error: e.message });
                    console.warn('[diskDB.setup] migration failed:', e);
                }
            }

            // Step 4: 寫到 folder
            let syncTo = null;
            if (folderHandle && FSAccess.isSupported()) {
                try {
                    if (await FSAccess.ensurePermission(folderHandle, 'readwrite')) {
                        syncTo = await this.syncAllToFolder(folderHandle);
                        try {
                            await this.writeManifest(folderHandle, { setupAt: new Date().toISOString() });
                        } catch (e) {
                            console.warn('[diskDB.setup] manifest write failed:', e);
                        }
                        log.push({ step: 'sync_to_folder', status: 'ok', written: syncTo.written });
                    } else {
                        log.push({ step: 'sync_to_folder', status: 'permission_denied' });
                    }
                } catch (e) {
                    log.push({ step: 'sync_to_folder', status: 'error', error: e.message });
                }
            }

            // Step 5: save folder info
            if (folderHandle && folderName) {
                await this.saveFolderInfo(folderHandle);
                log.push({ step: 'save_folder_info', status: 'ok', folderName });
            }

            // Step 6: 驗證
            const stats = await this.getStats();
            log.push({ step: 'verify', status: 'ok', stats });

            // Step 7: 寫 setup manifest
            const manifest = {
                version: '2.1.0',
                dbVersion: this.version,
                timestamp: new Date().toISOString(),
                startedAt,
                duration: Date.now() - startedAt,
                userId,
                schema: Object.keys(SCHEMA),
                folderName,
                folderSource,
                fsAccessSupported: FSAccess.isSupported(),
                syncTo,
                stats,
                migration,
                log
            };

            await this.setMeta('setup_manifest', manifest);
            log.push({ step: 'write_meta', status: 'ok' });

            this.setupLog = log;
            console.log('[diskDB.setup] done in ' + (Date.now() - startedAt) + 'ms', stats);

            return {
                success: true,
                duration: Date.now() - startedAt,
                folderHandle,
                folderName,
                folderSource,
                fsAccessSupported: FSAccess.isSupported(),
                syncTo,
                migration,
                stats,
                log,
                manifest
            };
        }

        // ============================================================
        // 從 localStorage 遷移 — 同 v2.0.0
        // ============================================================
        async migrateFromLocalStorage(userId = 'config') {
            console.log('[diskDB] starting migration from localStorage -> IndexedDB...');

            const existing = await this.get('meta', 'migration_v2');
            if (existing) {
                console.log('[diskDB] already migrated at', new Date(existing.value?.timestamp || existing.timestamp));
                return { migrated: false, reason: 'already_migrated', stats: existing.value?.stats };
            }

            const lsStr = localStorage.getItem(STORAGE_KEY_FAMILY);
            if (!lsStr) {
                console.log('[diskDB] no localStorage data found');
                await this.setMeta('migration_v2', { timestamp: Date.now(), stats: {} });
                return { migrated: false, reason: 'no_data' };
            }

            let data;
            try {
                data = JSON.parse(lsStr);
            } catch (e) {
                console.error('[diskDB] localStorage parse error:', e);
                return { migrated: false, reason: 'parse_error', error: e.message };
            }

            const user = data[userId];
            if (!user) {
                console.log('[diskDB] no user data for', userId);
                await this.setMeta('migration_v2', { timestamp: Date.now(), stats: {} });
                return { migrated: false, reason: 'no_user' };
            }

            const stats = {
                users: 0, categories: 0, projects: 0, subjects: 0,
                materialTypes: 0, instances: 0, vols: 0, units: 0,
                tasks: 0, plans: 0, accuracy: 0, meta: 0
            };

            const allPuts = [];

            allPuts.push(['users', {
                id: userId,
                name: user.name || userId,
                createdAt: Date.now(),
                settings: user.settings || {}
            }]);

            const catNameToId = {};
            Object.keys(user.masters || {}).forEach((catName, ci) => {
                const catId = 'cat_' + userId + '_' + ci;
                catNameToId[catName] = catId;
                allPuts.push(['categories', {
                    id: catId, userId, name: catName, order: ci, createdAt: Date.now()
                }]);
            });

            const catNameToProjId = {};
            Object.keys(user.masters || {}).forEach((catName, ci) => {
                const catId = catNameToId[catName];
                const projId = 'proj_' + catId + '_default';
                catNameToProjId[catName] = projId;
                allPuts.push(['projects', {
                    id: projId, categoryId: catId, name: '主要任務',
                    order: 0, createdAt: Date.now()
                }]);
            });

            Object.entries(user.masters || {}).forEach(([catName, subjects]) => {
                const catId = catNameToId[catName];
                const projId = catNameToProjId[catName];

                if (typeof subjects !== 'object') return;

                Object.entries(subjects).forEach(([subjName, subData]) => {
                    const subjId = 'subj_' + projId + '_' + subjName;
                    allPuts.push(['subjects', {
                        id: subjId, projectId: projId, name: subjName,
                        order: 0, createdAt: Date.now()
                    }]);

                    if (!subData || !subData.materials) return;

                    Object.entries(subData.materials).forEach(([typeName, typeObj]) => {
                        const mtId = 'mt_' + subjId + '_' + typeName;
                        allPuts.push(['materialTypes', {
                            id: mtId, subjectId: subjId, name: typeName,
                            order: 0, createdAt: Date.now()
                        }]);

                        if (!typeObj || !typeObj.instances) return;

                        typeObj.instances.forEach((ins, ii) => {
                            if (!ins) return;
                            const insName = ins.name || 'instance_' + ii;
                            const insId = 'inst_' + mtId + '_' + insName + '_' + ii;
                            allPuts.push(['instances', {
                                id: insId, materialTypeId: mtId, name: insName,
                                order: ii, createdAt: Date.now()
                            }]);

                            (ins.units || []).forEach(u => {
                                if (!u || !u.name) return;
                                allPuts.push(['units', {
                                    typeName, instanceName: insName,
                                    vol: u.vol || 'custom',
                                    unitName: u.name,
                                    _legacyUnitId: u.id,
                                    subject: subjName, cat: catName,
                                    start: u.start, end: u.end,
                                    createdAt: Date.now()
                                }]);
                            });

                            Object.entries(ins.vols || {}).forEach(([volName, volUnits]) => {
                                const volId = 'vol_' + insId + '_' + volName;
                                allPuts.push(['vols', {
                                    id: volId, instanceId: insId, name: volName,
                                    order: 0, createdAt: Date.now()
                                }]);

                                (volUnits || []).forEach(u => {
                                    if (!u || !u.name) return;
                                    allPuts.push(['units', {
                                        typeName, instanceName: insName,
                                        vol: volName, unitName: u.name,
                                        _legacyUnitId: u.id,
                                        subject: subjName, cat: catName,
                                        start: u.start, end: u.end,
                                        createdAt: Date.now()
                                    }]);
                                });
                            });
                        });
                    });
                });
            });

            (user.plans || []).forEach((plan, pi) => {
                const planId = plan.id || 'plan_' + userId + '_' + pi;
                allPuts.push(['plans', {
                    id: planId, userId,
                    name: plan.name || '',
                    start: plan.start || '',
                    end: plan.end || '',
                    order: pi,
                    rawGrid: plan.grid || {},
                    createdAt: Date.now()
                }]);

                if (!plan.grid) return;

                Object.entries(plan.grid).forEach(([date, tasks]) => {
                    (tasks || []).forEach(t => {
                        if (!t) return;
                        allPuts.push(['tasks', {
                            id: t.id || 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
                            planId, userId, date,
                            typeName: t.typeName || '',
                            instanceName: t.instanceName || '',
                            vol: t.vol || '',
                            unitName: t.unitName || '',
                            _legacyUnitId: t.unitId || '',
                            subject: t.subject || '',
                            cat: t.cat || '',
                            mis: t.mis || '',
                            text: t.text || '',
                            startPage: t.startPage || null,
                            endPage: t.endPage || null,
                            isDone: !!t.isDone,
                            postponeCount: t.postponeCount || 0,
                            isAuto: !!t.isAuto,
                            createdAt: Date.now()
                        }]);
                    });
                });
            });

            allPuts.push(['meta', {
                key: 'migration_v2',
                value: {
                    timestamp: Date.now(),
                    source: STORAGE_KEY_FAMILY,
                    userId,
                    version: '2.1.0'
                },
                updatedAt: Date.now()
            }]);
            allPuts.push(['meta', {
                key: 'currentUserId',
                value: userId,
                updatedAt: Date.now()
            }]);

            console.log('[diskDB] bulk-inserting ' + allPuts.length + ' records...');

            const byStore = {};
            allPuts.forEach(([storeName, record]) => {
                if (!byStore[storeName]) byStore[storeName] = [];
                byStore[storeName].push(record);
            });

            for (const [storeName, items] of Object.entries(byStore)) {
                await this.bulkPut(storeName, items);
                stats[storeName] = items.length;
            }

            console.log('[diskDB] migration complete:', stats);
            return { migrated: true, stats };
        }

        // ============================================================
        // Export (Download fallback)
        // ============================================================
        async exportAll() {
            const data = {
                exportedAt: new Date().toISOString(),
                version: '2.1.0',
                dbVersion: this.version,
                stores: {}
            };
            for (const storeName of Object.keys(SCHEMA)) {
                data.stores[storeName] = await this.getAll(storeName);
            }
            return data;
        }

        async exportToDownload() {
            const data = await this.exportAll();
            const filename = 'StudyMap_DB_export_' + new Date().toISOString().split('T')[0] + '.json';
            return Downloader.downloadFile(filename, JSON.stringify(data, null, 2));
        }

        async exportPerStoreToDownloads() {
            const files = [];
            for (const storeName of Object.keys(SCHEMA)) {
                const items = await this.getAll(storeName);
                files.push({
                    name: storeName + '.json',
                    content: JSON.stringify({
                        store: storeName,
                        count: items.length,
                        exportedAt: new Date().toISOString(),
                        items
                    }, null, 2),
                    mimeType: 'application/json'
                });
            }
            return Downloader.downloadFiles(files);
        }

        // ============================================================
        // Convenience API
        // ============================================================
        async getUnit(typeName, instanceName, vol, unitName) {
            return this.get('units', [typeName, instanceName, vol, unitName]);
        }

        async getUnitByLegacyId(legacyId) {
            const results = await this.getByIndex('units', '_legacyUnitId', legacyId);
            return results[0] || null;
        }

        async getUnitsBySubject(subject) {
            return this.getByIndex('units', 'subject', subject);
        }

        async getTasksByDate(date) {
            return this.getByIndex('tasks', 'date', date);
        }

        async getTasksByUnit(typeName, instanceName, vol, unitName) {
            return this.getByIndex('tasks', 'unitKey', [typeName, instanceName, vol, unitName]);
        }

        async getPlansByUser(userId) {
            return this.getByIndex('plans', 'userId', userId);
        }

        async getMeta(key) {
            const r = await this.get('meta', key);
            return r ? (r.value !== undefined ? r.value : r) : null;
        }

        async setMeta(key, value) {
            return this.put('meta', { key, value, updatedAt: Date.now() });
        }

        async getStats() {
            const stats = {};
            for (const storeName of Object.keys(SCHEMA)) {
                try {
                    stats[storeName] = await this.count(storeName);
                } catch (e) {
                    stats[storeName] = -1;
                }
            }
            return stats;
        }
    }

    // ============================================================
    // Singleton + Global API
    // ============================================================
    let _instance = null;

    window.diskDB = {
        getInstance: async function() {
            if (!_instance) {
                _instance = new LearningProgressDB();
                await _instance.init();
            }
            return _instance;
        },

        setup: async function(options = {}) {
            const db = await this.getInstance();
            return db.setup(options);
        },

        pickFolder: async function() {
            const db = await this.getInstance();
            const handle = await FSAccess.pickFolder();
            await db.storeHandle(handle);
            await db.saveFolderInfo(handle);
            return handle;
        },

        getStoredHandle: async function() {
            const db = await this.getInstance();
            return db.tryStoredHandle();
        },

        syncAllToFolder: async function(folderHandle = null) {
            const db = await this.getInstance();
            const handle = folderHandle || await db.tryStoredHandle();
            if (!handle) throw new Error('No folder handle. Pick a folder first.');
            return db.syncAllToFolder(handle);
        },

        syncAllFromFolder: async function(folderHandle = null) {
            const db = await this.getInstance();
            const handle = folderHandle || await db.tryStoredHandle();
            if (!handle) throw new Error('No folder handle. Pick a folder first.');
            return db.syncAllFromFolder(handle);
        },

        syncStoreToFolder: async function(storeName, folderHandle = null) {
            const db = await this.getInstance();
            const handle = folderHandle || await db.tryStoredHandle();
            if (!handle) throw new Error('No folder handle. Pick a folder first.');
            return db.syncOneToFolder(handle, storeName);
        },

        // ============================================================
        // v2.2.0 — Hybrid Sync (cross-browser)
        // ============================================================

        /** 同步單一 store (Chrome/Edge: 寫 folder, Safari/FF: 下載 1 個 .json) */
        syncStoreToDisk: async function(storeName) {
            const db = await this.getInstance();
            return db.syncStoreToDisk(storeName);
        },

        /** 同步所有 stores (Chrome/Edge: 寫 13 個檔, Safari/FF: 跳 13 個下載) */
        syncAllToDisk: async function() {
            const db = await this.getInstance();
            return db.syncAllToDisk();
        },

        /** 從 disk folder 載入 (Chrome/Edge 用 stored handle) */
        loadFromDiskFolder: async function() {
            const db = await this.getInstance();
            return db.loadFromDiskFolder();
        },

        /** 從 FileList (Safari webkitdirectory 選的) 載入 */
        loadFromJsonFiles: async function(files) {
            const db = await this.getInstance();
            return db.loadFromJsonFiles(files);
        },

        /** 開啟背景 auto-sync (預設 30s) */
        setupAutoSync: async function(intervalMs = 30000) {
            const db = await this.getInstance();
            return db.setupAutoSync(intervalMs);
        },

        /** 安裝 page unload listener, 離開前 sync */
        setupUnloadSync: async function() {
            const db = await this.getInstance();
            return db.setupUnloadSync();
        },

        instance: function() { return _instance; },

        SCHEMA: SCHEMA,
        DB_NAME: DB_NAME,
        DB_VERSION: DB_VERSION,
        DB_FOLDER_NAME: DB_FOLDER_NAME,
        STORAGE_KEY_FAMILY: STORAGE_KEY_FAMILY,

        LearningProgressDB: LearningProgressDB,
        FSAccess: FSAccess,
        Downloader: Downloader,

        isFileSystemAccessSupported: () => FSAccess.isSupported()
    };

    console.log('[diskDB] v2.2.0 module loaded — Hybrid Sync (auto + manual + cross-browser)')
    console.log('[diskDB] call window.diskDB.setup() to initialize');
})();
