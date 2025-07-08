// Проверка и исправление поврежденных данных в localStorage
try {
    const keys = ['currentUser', 'userCards', 'pendingWeb3Activation'];
    keys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item && item !== 'undefined' && item !== 'null') {
            try {
                JSON.parse(item);
            } catch (e) {
                console.warn(`Removing corrupted localStorage item: ${key}`);
                localStorage.removeItem(key);
            }
        }
    });
} catch (error) {
    console.error('Error cleaning localStorage:', error);
}

// WEB3 кошелек для CardGift - opBNB + SafePal приоритет (ПОЛНАЯ ВЕРСИЯ)
class WalletManager {
    constructor() {
        // Загружаем конфигурацию
        this.config = window.CONTRACT_CONFIG || null;
        
        if (!this.config) {
            console.error('❌ CONTRACT_CONFIG не найден! Проверьте config.js');
            return;
        }
        
        // Настройки из config
        this.contractAddress = this.config.CONTRACT_ADDRESS;
        this.contractABI = this.config.CONTRACT_ABI;
        this.chainId = this.config.CHAIN_ID;
        this.prices = this.config.PRICES;
        
        // opBNB конфигурация
        this.networkConfig = {
            chainId: '0xCC', // 204 в hex
            chainName: this.config.CHAIN_NAME,
            nativeCurrency: {
                name: this.config.CURRENCY_SYMBOL,
                symbol: this.config.CURRENCY_SYMBOL,
                decimals: this.config.CURRENCY_DECIMALS
            },
            rpcUrls: [this.config.RPC_URL],
            blockExplorerUrls: [this.config.BLOCK_EXPLORER]
        };
        
        // Состояние
        this.web3 = null;
        this.contract = null;
        this.currentAccount = null;
        this.isConnected = false;
        this.walletType = null;
        
        console.log('✅ WalletManager инициализирован с приоритетом SafePal');
    }
    
    // Инициализация Web3 (ИСПРАВЛЕНО)
    async initWeb3() {
        try {
            let provider = null;
            
            // ПРИОРИТЕТ: SafePal первым делом
            if (window.safepal) {
                provider = window.safepal;
                this.walletType = 'SafePal';
                console.log('🟢 Используем SafePal кошелек');
            } else if (window.ethereum) {
                provider = window.ethereum;
                this.walletType = 'MetaMask';
                console.log('🟡 Используем MetaMask кошелек');
            } else {
                throw new Error('Кошелек не найден');
            }
            
            this.web3 = new Web3(provider);
            
            if (this.contractAddress && this.contractABI) {
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                console.log('✅ Контракт подключен:', this.contractAddress);
                return true;
            } else {
                throw new Error('Адрес контракта или ABI отсутствует');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации Web3:', error);
            return false;
        }
    }
    
    // Основной метод подключения (УПРОЩЕННЫЙ)
    async connectWallet() {
    try {
        let accounts = [];
        
        if (this.walletType === 'safepal' && window.safepal) {
            // SafePal специальный API
            console.log('🔵 Подключаем SafePal через .connect()...');
            
            // SafePal использует .connect() вместо .request()
            const result = await window.safepal.connect();
            console.log('SafePal connect result:', result);
            
            // Получаем аккаунт через .getAccount()
            const account = await window.safepal.getAccount();
            console.log('SafePal account:', account);
            
            if (account) {
                accounts = [account];
            }
            
        } else if (window.ethereum) {
            // Стандартный Ethereum API
            console.log('⚪ Подключаем стандартный кошелек...');
            accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
        }
        
        if (accounts && accounts.length > 0) {
            this.currentAccount = accounts[0];
            this.isConnected = true;
            
            console.log('✅ Кошелек подключен:', this.currentAccount);
            return {
                address: this.currentAccount,
                walletType: this.walletType
            };
        }
        
        throw new Error('Не удалось получить аккаунты');
        
    } catch (error) {
        console.error('❌ Ошибка подключения кошелька:', error);
        throw error;
    }
}
    
    // Проверка и переключение на opBNB
    async ensureOpBNBNetwork() {
        try {
            const chainId = await this.web3.eth.getChainId();
            
            if (chainId !== this.chainId) {
                console.log('🔄 Переключаем на opBNB...');
                await this.switchToOpBNB();
            } else {
                console.log('✅ Уже в сети opBNB');
            }
        } catch (error) {
            console.error('❌ Ошибка проверки сети:', error);
            throw error;
        }
    }
    
    // Переключение на opBNB
    async switchToOpBNB() {
        try {
            const provider = window.safepal || window.ethereum;
            
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.networkConfig.chainId }]
            });
            
            console.log('✅ Переключено на opBNB');
            
        } catch (switchError) {
            if (switchError.code === 4902) {
                console.log('➕ Добавляем сеть opBNB...');
                await this.addOpBNBNetwork();
            } else {
                throw switchError;
            }
        }
    }
    
    // Добавление opBNB сети
    async addOpBNBNetwork() {
        const provider = window.safepal || window.ethereum;
        
        await provider.request({
            method: 'wallet_addEthereumChain',
            params: [this.networkConfig]
        });
        
        console.log('✅ Сеть opBNB добавлена');
    }
    
    // Получение баланса
    async getBalance() {
        if (!this.currentAccount) {
            throw new Error('Кошелек не подключен');
        }
        
        const balance = await this.web3.eth.getBalance(this.currentAccount);
        return this.web3.utils.fromWei(balance, 'ether');
    }
    
    // Регистрация пользователя
    async registerUser(referrerId = '') {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('📝 Регистрируем пользователя...');
            
            const result = await this.contract.methods
                .registerUser(referrerId)
                .send({ 
                    from: this.currentAccount,
                    gas: 300000
                });
                
            console.log('✅ Пользователь зарегистрирован:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            throw error;
        }
    }
    
    // Активация пользователя (0.0025 BNB)
    async activateUser() {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('💰 Активируем пользователя...');
            
            const result = await this.contract.methods
                .activateUser()
                .send({ 
                    from: this.currentAccount,
                    value: this.prices.ACTIVATION,
                    gas: 200000
                });
                
            console.log('✅ Пользователь активирован:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка активации:', error);
            throw error;
        }
    }
    
    // ВОССТАНОВЛЕНО: Активация мини-админа (0.05 BNB)
    async activateMiniAdmin() {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('👑 Активируем мини-админа...');
            
            const result = await this.contract.methods
                .activateMiniAdmin()
                .send({ 
                    from: this.currentAccount,
                    value: this.prices.MINI_ADMIN,
                    gas: 250000
                });
                
            console.log('✅ Мини-админ активирован:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка активации мини-админа:', error);
            throw error;
        }
    }
    
    // ВОССТАНОВЛЕНО: Активация супер-админа (0.25 BNB)
    async activateSuperAdmin() {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('👑 Активируем супер-админа...');
            
            const result = await this.contract.methods
                .activateSuperAdmin()
                .send({ 
                    from: this.currentAccount,
                    value: this.prices.SUPER_ADMIN,
                    gas: 300000
                });
                
            console.log('✅ Супер-админ активирован:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка активации супер-админа:', error);
            throw error;
        }
    }
    
    // Создание открытки
    async createCard(metadataHash) {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('🎨 Создаем открытку...');
            
            const result = await this.contract.methods
                .createCard(metadataHash)
                .send({ 
                    from: this.currentAccount,
                    gas: 200000
                });
                
            console.log('✅ Открытка создана:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка создания открытки:', error);
            throw error;
        }
    }
    
    // ВОССТАНОВЛЕНО: Удаление открытки
    async deleteCard(cardId) {
        if (!this.isConnected) {
            throw new Error('Кошелек не подключен');
        }
        
        try {
            console.log('🗑️ Удаляем открытку...');
            
            const result = await this.contract.methods
                .deleteCard(cardId)
                .send({ 
                    from: this.currentAccount,
                    gas: 150000
                });
                
            console.log('✅ Открытка удалена:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка удаления открытки:', error);
            throw error;
        }
    }
    
    // Получение данных пользователя
    async getUser(userId) {
        try {
            const result = await this.contract.methods
                .getUser(userId)
                .call();
                
            return {
                userId: result[0],
                wallet: result[1],
                level: parseInt(result[2]),
                referrerId: result[3],
                registrationTime: result[4],
                isActive: result[5],
                cardCount: result[6],
                totalEarned: result[7]
            };
            
        } catch (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            throw error;
        }
    }
    
    // Получение рефералов
    async getUserReferrals(userId) {
        try {
            return await this.contract.methods
                .getUserReferrals(userId)
                .call();
        } catch (error) {
            console.error('❌ Ошибка получения рефералов:', error);
            throw error;
        }
    }
    
    // Получение открыток пользователя
    async getUserCards(userId) {
        try {
            return await this.contract.methods
                .getUserCards(userId)
                .call();
        } catch (error) {
            console.error('❌ Ошибка получения открыток:', error);
            throw error;
        }
    }
    
    // Проверка статуса подключения
    isWalletConnected() {
        return this.isConnected && this.currentAccount;
    }
    
    // Получение адреса
    getAddress() {
        return this.currentAccount;
    }
    
    // Отключение кошелька
    disconnect() {
        this.currentAccount = null;
        this.isConnected = false;
        this.walletType = null;
        this.web3 = null;
        this.contract = null;
        console.log('🔌 Кошелек отключен');
    }
}

// Создаем глобальный экземпляр
window.walletManager = new WalletManager();

// УПРОЩЕННОЕ автоподключение
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const provider = window.safepal || window.ethereum;
        
        if (provider) {
            const accounts = await provider.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                await walletManager.connectWallet();
                console.log('✅ Автоподключение успешно');
            }
        }
    } catch (error) {
        console.log('ℹ️ Автоподключение недоступно');
    }
});

// Обработчики событий кошелька
if (window.safepal) {
    window.safepal.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            walletManager.disconnect();
            window.location.reload();
        } else {
            walletManager.currentAccount = accounts[0];
        }
    });
    
    window.safepal.on('chainChanged', () => {
        window.location.reload();
    });
} else if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            walletManager.disconnect();
            window.location.reload();
        } else {
            walletManager.currentAccount = accounts[0];
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
}
