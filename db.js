// db.js - IndexedDB 封裝
class LearningProgressDB {
    constructor() {
        this.dbName = 'LearningProgressDB';
        this.version = 2; // 版本 2 支援 logs 分頁
        this.db = null;
    }

    // 初始化資料庫
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                console.log('IndexedDB 版本升級: ', e.oldVersion, '→', e.newVersion);
                
                // 如果從頭開始建立
                if (e.oldVersion < 1) {
                    // 儲存 multiData.config 所有數據
                    if (!db.objectStoreNames.contains('config')) {
                        db.createObjectStore('config', { keyPath: 'key' });
                    }
                    
                    // 儲存 masters
                    if (!db.objectStoreNames.contains('masters')) {
                        db.createObjectStore('masters', { keyPath: 'key' });
                    }
                    
                    // 儲存 plans (支援多個計劃)
                    if (!db.objectStoreNames.contains('plans')) {
                        db.createObjectStore('plans', { keyPath: 'id' });
                    }
                    
                    // 儲存 logs（分頁支援）
                    if (!db.objectStoreNames.contains('logs')) {
                        const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                        logStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
                        logStore.createIndex('action_date', ['action', 'date'], { unique: false });
                    }
                }
                
                // 版本 2: 添加快取支援
                if (e.oldVersion < 2 && !db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('IndexedDB 連接成功');
                
                // 監聽關閉事件
                this.db.onclose = () => {
                    console.warn('IndexedDB 連接關閉');
                };
                
                resolve(this);
            };
            
            request.onerror = (e) => {
                console.error('IndexedDB 連接失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    // 基本 CRUD 操作
    async get(store, key) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readonly');
            const objStore = tx.objectStore(store);
            const request = objStore.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = (e) => {
                console.error('讀取失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async set(store, key, value) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const objStore = tx.objectStore(store);
            const item = { key, value, updatedAt: Date.now() };
            const request = objStore.put(item);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => {
                console.error('寫入失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async delete(store, key) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const objStore = tx.objectStore(store);
            const request = objStore.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => {
                console.error('刪除失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async getAll(store) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readonly');
            const objStore = tx.objectStore(store);
            const request = objStore.getAll();
            
            request.onsuccess = () => {
                const result = {};
                request.result.forEach(item => {
                    result[item.key] = item.value;
                });
                resolve(result);
            };
            request.onerror = (e) => {
                console.error('獲取全部失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    // 批次操作
    async batchSet(store, items) {
        if (!this.db) await this.init();
        if (!items || items.length === 0) return;
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(store, 'readwrite');
            const objStore = tx.objectStore(store);
            
            items.forEach(item => {
                const dbItem = typeof item === 'object' && item.key && item.value ? 
                    item : { key: item.key, value: item.value, updatedAt: Date.now() };
                objStore.put(dbItem);
            });
            
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => {
                console.error('批次寫入失敗:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    // 分頁查詢 logs
    async getLogs(userId, fromDate, toDate, limit = 100, offset = 0) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('logs', 'readonly');
            const objStore = tx.objectStore('logs');
            const index = objStore.index('userId_date');
            
            const keyRange = IDBKeyRange.bound([userId, fromDate], [userId, toDate]);
            
            // 獲取總數
            const countRequest = index.count(keyRange);
            
            countRequest.onsuccess = () => {
                const total = countRequest.result;
                
                // 分頁獲取
                const request = index.getAll(keyRange, limit);
                request.onsuccess = () => {
                    resolve({
                        data: request.result,
                        total: total,
                        offset: offset,
                        limit: limit
                    });
                };
                request.onerror = (e) => reject(e.target.error);
            };
            
            countRequest.onerror = (e) => reject(e.target.error);
        });
    }

    // 清除舊 logs (自動清理)
    async cleanupOldLogs(daysToKeep = 30) {
        if (!this.db) await this.init();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('logs', 'readwrite');
            const objStore = tx.objectStore('logs');
            const index = objStore.index('date');
            const keyRange = IDBKeyRange.upperBound(cutoffStr);
            
            const request = index.openCursor(keyRange);
            const deleted = [];
            
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    deleted.push(cursor.value);
                    cursor.delete();
                    cursor.continue();
                } else {
                    console.log('清理舊 logs: 刪除', deleted.length, '筆');
                    resolve(deleted.length);
                }
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // 估算資料庫大小
    async estimateSize() {
        if (!this.db) await this.init();
        
        const stores = ['config', 'masters', 'plans', 'logs', 'cache'];
        const sizes = {};
        let total = 0;
        
        for (const store of stores) {
            try {
                const data = await this.getAll(store);
                const jsonStr = JSON.stringify(data);
                sizes[store] = jsonStr.length;
                total += jsonStr.length;
            } catch (e) {
                sizes[store] = 0;
            }
        }
        
        return {
            stores: sizes,
            total: total,
            totalKB: Math.round(total / 1024),
            totalMB: Math.round(total / 1024 / 1024 * 100) / 100
        };
    }

    // 關閉資料庫連接
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('IndexedDB 連接已關閉');
        }
    }
}

// 單例模式 (Singleton)
window.IndexedDBManager = (function() {
    let instance = null;
    
    return {
        getInstance: function() {
            if (!instance) {
                instance = new LearningProgressDB();
            }
            return instance;
        }
    };
})();

// 瀏覽器相容性檢查
if (!window.indexedDB) {
    console.error('此瀏覽器不支援 IndexedDB，請升級瀏覽器');
}

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearningProgressDB;
}