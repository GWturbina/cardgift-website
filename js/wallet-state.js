// js/wallet-state.js - Общее состояние кошелька
class WalletState {
    constructor() {
        this.storageKey = 'cardgift_wallet_state';
        this.checkInterval = null;
    }

    // Сохранить состояние кошелька
    save(walletData) {
        const state = {
            address: walletData.address,
            userId: walletData.userId,
            level: walletData.level,
            isActive: walletData.isActive,
            connectedAt: Date.now(),
            lastSeen: Date.now()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(state));
        console.log('💾 Wallet state saved:', state.userId);
    }

    // Загрузить состояние кошелька
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return null;
            
            const state = JSON.parse(saved);
            
            // Проверяем не устарело ли (24 часа)
            if (Date.now() - state.lastSeen > 24 * 60 * 60 * 1000) {
                this.clear();
                return null;
            }
            
            console.log('📱 Wallet state loaded:', state.userId);
            return state;
        } catch (error) {
            console.error('❌ Error loading wallet state:', error);
            return null;
        }
    }

    // Обновить время последней активности
    updateLastSeen() {
        const saved = this.load();
        if (saved) {
            saved.lastSeen = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(saved));
        }
    }

    // Очистить состояние
    clear() {
        localStorage.removeItem(this.storageKey);
        console.log('🧹 Wallet state cleared');
    }

    // Автоматическое обновление активности
    startHeartbeat() {
        this.checkInterval = setInterval(() => {
            this.updateLastSeen();
        }, 30000); // Каждые 30 секунд
    }

    stopHeartbeat() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Глобальный экземпляр
window.walletState = new WalletState();
