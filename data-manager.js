// data-manager.js - 資料管理層 API
class DataManager {
    constructor() {
        this.db = null;
        this.isLegacy = false;
        this.localStorageKey = 'multiData';
        this.currentUserId = 'config'; // 預設用戶
        
        // 記憶體快取（提升效能）
        this.cache = {
            config: null,
            masters: null,
            plans: null,
            dirty: false,
            lastSync: 0
        };
        
        // 自動儲存設定
        this.autoSave = {
            enabled: true,
            interval: 1000, // 1秒防抖動
            timeoutId: null,
            minChanges: 5    // 至少 5 筆變更才觸發
        };
        
        // 變更追蹤
        this.changeTracker = {
            count: 0,
            lastChange: 0
        };
    }

    // 初始化
    async init() {
        try {
            // 初始化 IndexedDB
            this.db = window.IndexedDBManager ? 
                     window.IndexedDBManager.getInstance() : 
                     new (window.LearningProgressDB || await import('./db.js').then(m => m.default));
            await this.db.init();
            
            // 檢查是否已有資料在 IndexedDB
            const configData = await this.db.get('config', 'root');
            
            if (!configData) {
                // 從 localStorage 遷移數據
                console.log('偵測到 localStorage 數據，開始遷移...');
                await this.migrateFromLocalStorage();
                this.isLegacy = false;
            } else {
                // 從 IndexedDB 載入
                await this.loadFromIndexedDB();
                this.isLegacy = false;
            }
            
            // 設定全局變數
            window.dataManager = this;
            
            // 啟動自動儲存
            this.setupAutoSave();
            
            // 監聽頁面卸載
            this.setupPageUnload();
            
            console.log('DataManager 初始化完成 (IndexedDB 模式)');
            return this;
            
        } catch (e) {
            console.error('DataManager 初始化失敗，降級到 localStorage:', e);
            await this.fallbackToLocalStorage();
            return this;
        }
    }

    // 從 localStorage 遷移數據
    async migrateFromLocalStorage() {
        try {
            const legacyData = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
            
            if (!legacyData || !legacyData.config) {
                console.log('localStorage 中無資料，建立空白結構');
                await this.createDefaultData();
                return;
            }
            
            console.log('開始遷移數據，來源大小:', 
                       Math.round((JSON.stringify(legacyData).length) / 1024), 'KB');
            
            // 儲存 config
            const config = legacyData.config;
            await this.db.set('config', 'root', config);
            this.cache.config = config;
            
            // 儲存 masters（分批處理）
            if (config.masters && typeof config.masters === 'object') {
                const masterItems = [];
                
                Object.entries(config.masters).forEach(([key, value]) => {
                    masterItems.push({ key, value });
                });
                
                if (masterItems.length > 0) {
                    await this.db.batchSet('masters', masterItems);
                }
                this.cache.masters = config.masters;
            }
            
            // 儲存 plans
            if (config.plans && Array.isArray(config.plans)) {
                const planItems = config.plans.map((plan, idx) => ({
                    key: `plan_${idx}`,
                    value: plan
                }));
                
                if (planItems.length > 0) {
                    await this.db.batchSet('plans', planItems);
                }
                this.cache.plans = config.plans;
            }
            
            // 遷移 logs
            if (legacyData.logs && typeof legacyData.logs === 'object') {
                await this.migrateLogs(legacyData.logs);
            }
            
            // 建立備份
            localStorage.setItem(`${this.localStorageKey}_backup_${Date.now()}`, 
                               JSON.stringify(legacyData));
                               
            console.log('數據遷移完成');
            
        } catch (e) {
            console.error('遷移失敗:', e);
            throw e;
        }
    }
    
    // 遷移 logs（分批）
    async migrateLogs(logs) {
        const entries = Object.entries(logs);
        if (entries.length === 0) return;
        
        console.log(`遷移 ${entries.length} 筆 logs...`);
        
        // 分批處理避免過大
        const batchSize = 100;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const batchItems = batch.map(([key, log]) => ({
                key: key,
                value: {
                    ...log,
                    migratedAt: Date.now()
                }
            }));
            
            await this.db.batchSet('logs', batchItems);
            
            if (i % 500 === 0 || i + batchSize >= entries.length) {
                console.log(`  ${Math.min(i + batchSize, entries.length)}/${entries.length}`);
            }
        }
        
        console.log('logs 遷移完成');
    }

    // 從 IndexedDB 載入數據到快取
    async loadFromIndexedDB() {
        try {
            // 載入 config
            this.cache.config = await this.db.get('config', 'root');
            if (!this.cache.config) {
                await this.createDefaultData();
                return;
            }
            
            // 載入 masters（需要時才載入）
            this.cache.masters = await this.db.getAll('masters');
            
            // 載入 plans
            const planItems = await this.db.get('config', 'plans') || [];
            if (planItems && Array.isArray(planItems.value)) {
                this.cache.plans = planItems.value;
            } else {
                // 嘗試從舊位置載入
                const plans = await this.db.getAll('plans');
                this.cache.plans = Object.values(plans).map(item => item.value);
            }
            
            this.cache.lastSync = Date.now();
            console.log('從 IndexedDB 快取載入完成');
            
        } catch (e) {
            console.error('從 IndexedDB 載入失敗:', e);
            throw e;
        }
    }

    // 建立預設資料結構
    async createDefaultData() {
        console.log('建立預設資料結構');
        
        const defaultConfig = {
            version: '1.7.0',
            settings: {},
            preferences: {},
            missions: {},
            updatedAt: Date.now()
        };
        
        this.cache.config = defaultConfig;
        this.cache.masters = {};
        this.cache.plans = [];
        
        await this.db.set('config', 'root', defaultConfig);
        await this.db.set('config', 'plans', []);
        await this.db.set('config', 'masters', {});
        
        console.log('預設結構建立完成');
    }

    // 降級到 localStorage
    async fallbackToLocalStorage() {
        console.warn('降級到 localStorage 模式');
        
        this.isLegacy = true;
        this.db = null;
        
        // 從 localStorage 載入
        const data = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
        
        if (data.config) {
            this.cache.config = data.config;
            this.cache.masters = data.config.masters || {};
            this.cache.plans = data.config.plans || [];
        } else {
            await this.createDefaultData();
        }
        
        window.dataManager = this;
    }

    // 設定自動儲存
    setupAutoSave() {
        if (!this.autoSave.enabled) return;
        
        // 偵聽頁面變化
        function trackChange() {
            this.changeTracker.count++;
            this.changeTracker.lastChange = Date.now();
            
            if (this.autoSave.timeoutId) {
                clearTimeout(this.autoSave.timeoutId);
            }
            
            // 防抖動：1秒後自動儲存
            this.autoSave.timeoutId = setTimeout(async () => {
                if (this.changeTracker.count >= this.autoSave.minChanges) {
                    await this.save();
                    this.changeTracker.count = 0;
                }
            }, this.autoSave.interval);
        }
        
        // 綁定 trackChange 到 this
        window._trackChange = trackChange.bind(this);
        
        // 監聽自定義事件
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('appDataChanged', () => window._trackChange());
        }
    }

    // 設定頁面卸載處理
    setupPageUnload() {
        if (!this.db || this.isLegacy) return;
        
        window.addEventListener('beforeunload', (e) => {
            if (this.changeTracker.count > 0) {
                // 警告用戶有未儲存的變更
                e.preventDefault();
                e.returnValue = '您有未儲存的變更，確定要離開嗎？';
            }
        });
        
        window.addEventListener('pagehide', () => {
            // 儲存所有未儲存的變更
            this.save().catch(err => {
                console.error('頁面卸載時儲存失敗:', err);
            });
        });
    }

    // === 公有 API ===

    // 獲取 config
    async getConfig() {
        return this.cache.config;
    }

    // 獲取 masters（可選特定 key）
    async getMasters(key = null) {
        if (key) {
            return this.cache.masters ? this.cache.masters[key] : null;
        }
        return this.cache.masters || {};
    }

    // 獲取 plans
    async getPlans() {
        return this.cache.plans || [];
    }

    // 獲取 current plan（第 0 個計劃）
    async getCurrentPlan() {
        const plans = await this.getPlans();
        return plans[0] || null;
    }

    // 獲取 plan.grid 中的任務
    async getTasks(date = null) {
        const plan = await this.getCurrentPlan();
        if (!plan || !plan.grid) return [];
        
        if (date) {
            return plan.grid[date] || [];
        }
        
        // 獲取所有任務
        const allTasks = [];
        Object.entries(plan.grid || {}).forEach(([date, tasks]) => {
            tasks.forEach((task, idx) => {
                allTasks.push({
                    date,
                    index: idx,
                    ...task
                });
            });
        });
        
        return allTasks;
    }

    // 更新 config
    async updateConfig(newConfig) {
        const oldConfig = { ...this.cache.config };
        this.cache.config = {
            ...oldConfig,
            ...newConfig,
            updatedAt: Date.now()
        };
        
        this.cache.dirty = true;
        this.trackChange();
        
        return await this.save();
    }

    // 更新 masters
    async updateMasters(key, value) {
        if (!this.cache.masters) this.cache.masters = {};
        
        const oldValue = this.cache.masters[key];
        this.cache.masters[key] = value;
        
        this.cache.dirty = true;
        this.trackChange();
        
        return await this.save();
    }

    // 更新 plans
    async updatePlans(newPlans) {
        this.cache.plans = newPlans;
        this.cache.dirty = true;
        this.trackChange();
        
        return await this.save();
    }

    // 更新任務
    async updateTask(date, index, taskUpdate) {
        const plans = await this.getPlans();
        if (!plans[0]) return false;
        
        if (!plans[0].grid[date]) {
            plans[0].grid[date] = [];
        }
        
        if (!plans[0].grid[date][index]) {
            console.error('任務不存在:', date, index);
            return false;
        }
        
        // 更新任務
        plans[0].grid[date][index] = {
            ...plans[0].grid[date][index],
            ...taskUpdate
        };
        
        this.cache.plans = plans;
        this.cache.dirty = true;
        this.trackChange();
        
        return await this.save();
    }

    // 新增任務
    async addTask(date, task) {
        const plans = await this.getPlans();
        if (!plans[0]) return false;
        
        if (!plans[0].grid[date]) {
            plans[0].grid[date] = [];
        }
        
        plans[0].grid[date].push(task);
        this.cache.plans = plans;
        this.cache.dirty = true;
        this.trackChange();
        
        return await this.save();
    }

    // 刪除任務
    async deleteTask(date, index) {
        const plans = await this.getPlans();
        if (!plans[0] || !plans[0].grid[date]) return false;
        
        if (index >= 0 && index < plans[0].grid[date].length) {
            plans[0].grid[date].splice(index, 1);
            
            // 如果該日期沒有任務，清除陣列
            if (plans[0].grid[date].length === 0) {
                delete plans[0].grid[date];
            }
            
            this.cache.plans = plans;
            this.cache.dirty = true;
            this.trackChange();
            
            return await this.save();
        }
        
        return false;
    }

    // 紀錄操作
    async log(action, data = {}) {
        if (!this.db || this.isLegacy) {
            console.log('[LocalStorage]', action, data);
            return;
        }
        
        try {
            const logEntry = {
                userId: this.currentUserId,
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                action,
                data
            };
            
            const logId = `log_${this.currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await this.db.set('logs', logId, logEntry);
            
            return logId;
        } catch (e) {
            console.error('紀錄操作失敗:', e);
        }
    }

    // 儲存數據
    async save() {
        if (this.isLegacy) {
            // localStorage 模式
            const data = {
                config: this.cache.config,
                logs: {} // logs 不儲存在 localStorage
            };
            localStorage.setItem(this.localStorageKey, JSON.stringify(data));
            console.log('儲存到 localStorage');
            return true;
        }
        
        try {
            // IndexedDB 模式
            if (!this.cache.dirty && this.cache.config) {
                console.log('沒有變更，跳過儲存');
                return true;
            }
            
            const start = performance.now();
            
            // 儲存到 IndexedDB
            await this.db.set('config', 'root', this.cache.config);
            
            if (this.cache.masters) {
                // 分批儲存 masters
                const masterItems = Object.entries(this.cache.masters).map(([key, value]) => ({
                    key,
                    value
                }));
                
                if (masterItems.length > 0) {
                    await this.db.batchSet('masters', masterItems);
                }
            }
            
            if (this.cache.plans) {
                // 儲存 plans
                const planItems = {
                    key: 'plans',
                    value: this.cache.plans
                };
                await this.db.set('config', 'plans', this.cache.plans);
            }
            
            this.cache.dirty = false;
            this.cache.lastSync = Date.now();
            
            const duration = performance.now() - start;
            console.log(`儲存完成 (${Math.round(duration)}ms)`);
            
            return true;
            
        } catch (e) {
            console.error('儲存失敗:', e);
            
            // 嘗試降級
            if (!this.isLegacy) {
                console.warn('IndexedDB 儲存失敗，嘗試降級到 localStorage');
                await this.fallbackToLocalStorage();
                return await this.save();
            }
            
            return false;
        }
    }

    // 手動觸發變更追蹤（供外部應用呼叫）
    trackChange() {
        this.changeTracker.count++;
        this.changeTracker.lastChange = Date.now();
        
        // 發出事件通知
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('appDataChanged'));
        }
    }

    // 檢查 IndexedDB 是否可用
    async checkStatus() {
        return {
            mode: this.isLegacy ? 'localStorage' : 'IndexedDB',
            dbInitialized: !!this.db,
            cacheStatus: {
                config: !!this.cache.config,
                masters: this.cache.masters ? Object.keys(this.cache.masters).length : 0,
                plans: this.cache.plans ? this.cache.plans.length : 0,
                dirty: this.cache.dirty,
                lastSync: this.cache.lastSync
            },
            changeTracker: { ...this.changeTracker },
            localStorageSize: localStorage.getItem(this.localStorageKey) 
                ? Math.round(localStorage.getItem(this.localStorageKey).length / 1024) 
                : 0
        };
    }

    // 匯出所有資料
    async exportData() {
        const data = {
            version: '1.7.0',
            timestamp: Date.now(),
            mode: this.isLegacy ? 'localStorage' : 'IndexedDB',
            config: this.cache.config,
            masters: this.cache.masters,
            plans: this.cache.plans
        };
        
        return data;
    }

    // 匯入資料（完全取代）
    async importData(data) {
        if (!data || !data.config) {
            throw new Error('無效的資料格式');
        }
        
        console.log('匯入資料中...');
        
        this.cache.config = data.config;
        this.cache.masters = data.masters || {};
        this.cache.plans = data.plans || [];
        this.cache.dirty = true;
        
        // 強制儲存
        await this.save();
        
        console.log('資料匯入完成');
        return true;
    }

    // 資料庫維護
    async maintenance() {
        if (this.isLegacy) {
            console.log('localStorage 模式不支援維護操作');
            return;
        }
        
        try {
            // 清理舊 logs
            await this.db.cleanupOldLogs(30);
            
            // 估算大小
            const size = await this.db.estimateSize();
            
            console.log('資料庫維護完成:', size);
            return size;
        } catch (e) {
            console.error('維護失敗:', e);
        }
    }

    // 關閉資料庫
    close() {
        if (this.db && !this.isLegacy) {
            this.db.close();
        }
        
        if (this.autoSave.timeoutId) {
            clearTimeout(this.autoSave.timeoutId);
        }
        
        console.log('DataManager 已關閉');
    }
}

// 建立全局實例
window.DataManagerInstance = (function() {
    let instance = null;
    
    return {
        getInstance: async function() {
            if (!instance) {
                instance = new DataManager();
                await instance.init();
            }
            return instance;
        }
    };
})();

// 簡化的全局函數（向下相容）
window.saveToLocal = async function() {
    const dm = await window.DataManagerInstance.getInstance();
    return await dm.save();
};

// 匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}