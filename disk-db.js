// disk-db.js - v2.0.0 Complete IndexedDB Schema with Setup
// 完整的學習進度資料庫 — 所有資料皆可從 DB 存取
// Composite primary key [typeName, instanceName, vol, unitName] 從結構面杜絕 vol 漏失問題
//
// 設計原則:
// - DB 為 front-end 產物 (純瀏覽器 IndexedDB + OPFS)
// - 資料存放在 local disk (由 web UI 全權控制)
// - 完整 setup() 程序：建立資料夾結構 + 初始化 schema + 自動遷移

(function() {
    'use strict';

    const DB_NAME = 'LearningProgressDB';
    const DB_VERSION = 3; // v2.0.0
    const STORAGE_KEY_FAMILY = 'StudyMap_Family_Data_V20';
    const DB_FOLDER_NAME = 'StudyMap_DB'; // OPFS / Downloads 子資料夾名

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
        // 12. 中介資料 (migration 狀態、currentUserId 等)
        meta: {
            keyPath: 'key'
        }
    };

    // ============================================================
    // OPFS (Origin Private File System) helpers
    // 給 web UI 在 local disk 上建立 folder 結構用
    // ============================================================
    const OPFS = {
        /**
         * 檢查 OPFS 是否支援
         */
        isSupported() {
            return !!(navigator.storage && navigator.storage.getDirectory);
        },

        /**
         * 取得或建立 StudyMap_DB 根資料夾
         */
        async getRootFolder(create = true) {
            if (!this.isSupported()) {
                throw new Error('OPFS not supported in this browser');
            }
            const root = await navigator.storage.getDirectory();
            return root.getDirectoryHandle(DB_FOLDER_NAME, { create });
        },

        /**
         * 建立 12 個 store 子資料夾
         */
        async createStoreFolders() {
            const root = await this.getRootFolder(true);
            const created = {};
            for (const storeName of Object.keys(SCHEMA)) {
                try {
                    await root.getDirectoryHandle(storeName, { create: true });
                    created[storeName] = `${DB_FOLDER_NAME}/${storeName}`;
                } catch (e) {
                    created[storeName + '_error'] = e.message;
                }
            }
            // 額外資料夾
            await root.getDirectoryHandle('backups', { create: true });
            await root.getDirectoryHandle('exports', { create: true });
            created.backups = `${DB_FOLDER_NAME}/backups`;
            created.exports = `${DB_FOLDER_NAME}/exports`;
            return created;
        },

        /**
         * 寫入檔案到 OPFS folder
         */
        async writeFile(folderPath, fileName, content) {
            const root = await navigator.storage.getDirectory();
            let dir = root;
            const parts = folderPath.split('/');
            for (const part of parts) {
                if (part) dir = await dir.getDirectoryHandle(part, { create: true });
            }
            const fileHandle = await dir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return `${folderPath}/${fileName}`;
        },

        /**
         * 讀取 OPFS 檔案
         */
        async readFile(folderPath, fileName) {
            const root = await navigator.storage.getDirectory();
            let dir = root;
            const parts = folderPath.split('/');
            for (const part of parts) {
                if (part) dir = await dir.getDirectoryHandle(part, { create: false });
            }
            const fileHandle = await dir.getFileHandle(fileName, { create: false });
            const file = await fileHandle.getFile();
            return await file.text();
        }
    };

    // ============================================================
    // Browser Download helper
    // 把檔案下載到使用者系統 Downloads 資料夾
    // ============================================================
    const Downloader = {
        /**
         * 觸發瀏覽器下載 (存到使用者系統 Downloads 資料夾)
         */
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

        /**
         * 下載多個檔案 (連續觸發)
         */
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
            this.setupLog = []; // setup() 過程記錄
        }

        // ============================================================
        // 初始化 DB 連線
        // ============================================================
        async init() {
            if (this.db) return this;
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);

                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    const oldV = e.oldVersion;
                    console.log(`[diskDB] upgrade: ${oldV} → ${this.version}`);

                    Object.entries(SCHEMA).forEach(([storeName, config]) => {
                        let store;
                        const opts = { keyPath: config.keyPath };
                        if (config.autoIncrement) opts.autoIncrement = true;

                        if (db.objectStoreNames.contains(storeName)) {
                            store = e.target.transaction.objectStore(storeName);
                        } else {
                            store = db.createObjectStore(storeName, opts);
                        }

                        // Create indexes
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

        // ============================================================
        // Generic CRUD
        // ============================================================
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
        // Setup 程序 (核心新增)
        // 完整流程：建資料夾 → 初始化 schema → 自動遷移 → 寫 manifest
        // ============================================================
        async setup(options = {}) {
            const userId = options.userId || 'config';
            const log = [];
            const startedAt = Date.now();

            console.log('[diskDB.setup] 開始 setup 程序...');
            log.push({ step: 'start', timestamp: startedAt });

            // Step 1: 初始化 IndexedDB
            try {
                await this.init();
                log.push({ step: 'init_db', status: 'ok', version: this.version });
            } catch (e) {
                log.push({ step: 'init_db', status: 'error', error: e.message });
                throw e;
            }

            // Step 2: 建立 OPFS 資料夾結構 (browser-side local disk)
            let folders = null;
            if (options.createFolders !== false) {
                if (OPFS.isSupported()) {
                    try {
                        folders = await OPFS.createStoreFolders();
                        log.push({ step: 'create_folders', status: 'ok', folders });
                        console.log('[diskDB.setup] ✅ OPFS folder 結構建立完成:', folders);
                    } catch (e) {
                        log.push({ step: 'create_folders', status: 'error', error: e.message });
                        console.warn('[diskDB.setup] ⚠️ OPFS folder 建立失敗:', e);
                    }
                } else {
                    log.push({ step: 'create_folders', status: 'skipped', reason: 'OPFS not supported' });
                    console.log('[diskDB.setup] ℹ️ 瀏覽器不支援 OPFS, 跳過 folder 建立');
                }
            }

            // Step 3: 自動遷移 (從 localStorage → IndexedDB)
            let migration = null;
            if (options.migrate !== false) {
                try {
                    migration = await this.migrateFromLocalStorage(userId);
                    log.push({ step: 'migrate', status: 'ok', migration });
                } catch (e) {
                    log.push({ step: 'migrate', status: 'error', error: e.message });
                    console.warn('[diskDB.setup] ⚠️ 遷移失敗:', e);
                }
            }

            // Step 4: 驗證所有 stores 都建好
            const stats = await this.getStats();
            const missing = Object.keys(SCHEMA).filter(k => stats[k] === undefined || stats[k] < 0);
            log.push({
                step: 'verify',
                status: missing.length === 0 ? 'ok' : 'error',
                stats,
                missing
            });

            // Step 5: 寫 setup manifest
            const manifest = {
                version: '2.0.0',
                dbVersion: this.version,
                timestamp: new Date().toISOString(),
                startedAt,
                duration: Date.now() - startedAt,
                userId,
                schema: Object.keys(SCHEMA),
                folders,
                stats,
                migration,
                log
            };

            // 寫到 meta store (永久)
            await this.setMeta('setup_manifest', manifest);
            log.push({ step: 'write_meta', status: 'ok' });

            // 寫到 OPFS (local disk)
            if (OPFS.isSupported() && folders) {
                try {
                    const path = await OPFS.writeFile(
                        `${DB_FOLDER_NAME}/meta`,
                        'setup_manifest.json',
                        JSON.stringify(manifest, null, 2)
                    );
                    log.push({ step: 'write_opfs', status: 'ok', path });
                } catch (e) {
                    log.push({ step: 'write_opfs', status: 'error', error: e.message });
                }
            }

            this.setupLog = log;
            console.log(`[diskDB.setup] ✅ 完成 (${Date.now() - startedAt}ms)`, manifest.stats);
            return {
                success: true,
                duration: Date.now() - startedAt,
                stats,
                folders,
                migration,
                log,
                manifest
            };
        }

        // ============================================================
        // 從 localStorage 遷移 (含冪等檢查)
        // ============================================================
        async migrateFromLocalStorage(userId = 'config') {
            console.log('[diskDB] starting migration from localStorage → IndexedDB...');

            // Check if already migrated
            const existing = await this.get('meta', 'migration_v2');
            if (existing) {
                console.log('[diskDB] already migrated at', new Date(existing.value?.timestamp || existing.timestamp));
                return { migrated: false, reason: 'already_migrated', stats: existing.value?.stats };
            }

            const lsStr = localStorage.getItem(STORAGE_KEY_FAMILY);
            if (!lsStr) {
                console.log('[diskDB] no localStorage data found, creating empty DB');
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

            // 1. Users
            allPuts.push(['users', {
                id: userId,
                name: user.name || userId,
                createdAt: Date.now(),
                settings: user.settings || {}
            }]);

            // 2-7. Hierarchy
            const catNameToId = {};
            Object.keys(user.masters || {}).forEach((catName, ci) => {
                const catId = `cat_${userId}_${ci}`;
                catNameToId[catName] = catId;
                allPuts.push(['categories', {
                    id: catId, userId, name: catName, order: ci, createdAt: Date.now()
                }]);
            });

            const catNameToProjId = {};
            Object.keys(user.masters || {}).forEach((catName, ci) => {
                const catId = catNameToId[catName];
                const projId = `proj_${catId}_default`;
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
                    const subjId = `subj_${projId}_${subjName}`;
                    allPuts.push(['subjects', {
                        id: subjId, projectId: projId, name: subjName,
                        order: 0, createdAt: Date.now()
                    }]);

                    if (!subData || !subData.materials) return;

                    Object.entries(subData.materials).forEach(([typeName, typeObj]) => {
                        const mtId = `mt_${subjId}_${typeName}`;
                        allPuts.push(['materialTypes', {
                            id: mtId, subjectId: subjId, name: typeName,
                            order: 0, createdAt: Date.now()
                        }]);

                        if (!typeObj || !typeObj.instances) return;

                        typeObj.instances.forEach((ins, ii) => {
                            if (!ins) return;
                            const insName = ins.name || `instance_${ii}`;
                            const insId = `inst_${mtId}_${insName}_${ii}`;
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
                                const volId = `vol_${insId}_${volName}`;
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

            // 9-10. Tasks + Plans
            (user.plans || []).forEach((plan, pi) => {
                const planId = plan.id || `plan_${userId}_${pi}`;
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
                            id: t.id || `task_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
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

            // 12. Meta
            allPuts.push(['meta', {
                key: 'migration_v2',
                value: {
                    timestamp: Date.now(),
                    source: STORAGE_KEY_FAMILY,
                    userId,
                    version: '2.0.0'
                },
                updatedAt: Date.now()
            }]);
            allPuts.push(['meta', {
                key: 'currentUserId',
                value: userId,
                updatedAt: Date.now()
            }]);

            console.log(`[diskDB] bulk-inserting ${allPuts.length} records...`);

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
        // Export 全部資料 (JSON 格式)
        // 供下載到 Downloads 資料夾
        // ============================================================
        async exportAll() {
            const data = {
                exportedAt: new Date().toISOString(),
                version: '2.0.0',
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
            const filename = `StudyMap_DB_export_${new Date().toISOString().split('T')[0]}.json`;
            return Downloader.downloadFile(filename, JSON.stringify(data, null, 2));
        }

        async exportPerStoreToDownloads() {
            const files = [];
            for (const storeName of Object.keys(SCHEMA)) {
                const items = await this.getAll(storeName);
                files.push({
                    name: `${storeName}.json`,
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
        /**
         * Get DB instance (async init)
         */
        getInstance: async function() {
            if (!_instance) {
                _instance = new LearningProgressDB();
                await _instance.init();
            }
            return _instance;
        },

        /**
         * 完整 setup() — 首次使用必跑 (建立資料夾 + 初始化 + 遷移)
         * 用法: await window.diskDB.setup({ userId: 'config' })
         */
        setup: async function(options = {}) {
            const db = await this.getInstance();
            return db.setup(options);
        },

        /**
         * Get already-initialized instance (sync, may be null)
         */
        instance: function() { return _instance; },

        /**
         * Schema constants
         */
        SCHEMA: SCHEMA,
        DB_NAME: DB_NAME,
        DB_VERSION: DB_VERSION,
        DB_FOLDER_NAME: DB_FOLDER_NAME,
        STORAGE_KEY_FAMILY: STORAGE_KEY_FAMILY,

        /**
         * Module 對外暴露
         */
        LearningProgressDB: LearningProgressDB,
        OPFS: OPFS,
        Downloader: Downloader
    };

    console.log('[diskDB] module loaded, version', DB_VERSION, '— 呼叫 window.diskDB.setup() 開始');

})();