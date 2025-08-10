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
    
    // Инициализация Web3 (ИСПРАВЛЕНО - БЕЗ ТРЕБОВАНИЯ КОШЕЛЬКА)
    async initWeb3() {
        try {
            console.log('🔍 Ищем доступные кошельки...');
            console.log('window.safepal:', !!window.safepal);
            console.log('window.ethereum:', !!window.ethereum);
            
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
                console.warn('⚠️ Кошелек не найден, работаем без Web3');
                return false; // НЕ БРОСАЕМ ОШИБКУ
            }
            
            this.web3 = new Web3(provider);
            
            if (this.contractAddress && this.contractABI) {
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                console.log('✅ Контракт подключен:', this.contractAddress);
                return true;
            } else {
                console.warn('⚠️ Адрес контракта или ABI отсутствует');
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации Web3:', error);
            return false; // НЕ БРОСАЕМ ОШИБКУ
        }
    }
    
// Основной метод подключения (ИСПРАВЛЕННЫЙ)
async connectWallet() {
    try {
        let accounts = [];
        
        if (window.safepal) {
            console.log('🔵 Подключаем SafePal...');
            accounts = await window.safepal.request({method: 'eth_requestAccounts'});
            this.walletType = 'SafePal';
        } else if (window.ethereum) {
            console.log('⚪ Подключаем стандартный кошелек...');
            accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
            this.walletType = 'MetaMask';
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
        // ✅ ПРОВЕРЯЕМ АВТОРА
        const owner = await this.contract.methods.owner().call();
        if (userId.toLowerCase() === owner.toLowerCase()) {
            console.log('👑 Contract owner detected - full access granted');
            return {
                userId: "AUTHOR",
                wallet: userId,
                level: 6,
                referrerId: "",
                registrationTime: Date.now(),
                isActive: true,
                cardCount: 0,
                totalEarned: 0
            };
        }

        // ✅ ИСПРАВЛЕННЫЕ АДРЕСА ОСНОВАТЕЛЕЙ СОГЛАСНО СМАРТ-КОНТРАКТУ
const CENTRAL_FOUNDER = '0x0099188030174e381e7a7ee36d2783ecc31b6728'; // АВТОР

const ALL_FOUNDERS = [
    '0x0099188030174e381e7a7ee36d2783ecc31b6728', // АВТОР (уровень 6)
    '0xAB17aDbe29c4E1d695C239206682B02ebdB3f707', // СОАВТОР 1 (уровень 5)
    '0xB5986B808dad481ad86D63DF152cC0ad7B473e48', // СОАВТОР 2 (уровень 5)
    '0xa3496caCC8523421Dd151f1d92A456c2daFa28c2', // СОАВТОР 3 (уровень 5)
    '0x8af1BC6B4a5aACED37889CC06bed4569A6B64044', // СОАВТОР 4 (уровень 5)
    '0x0AB97e3934b1Afc9F1F6447CCF676E4f1D8B9639', // СОАВТОР 5 (уровень 5)
    '0x03284A899147f5a07F82C622F34DF92198671635', // СОАВТОР 6 (уровень 5)
    '0xb0E256cA055937a8FD9CA1F5e3D8A6bD44146d50'  // СОАВТОР 7 (уровень 5)
];

        // ✅ ПРОВЕРЯЕМ ЦЕНТРАЛЬНОГО АВТОРА
        if (userId.toLowerCase() === CENTRAL_FOUNDER.toLowerCase()) {
            console.log('👑 Central founder detected - full access granted');
            return {
                userId: "AUTHOR",
                wallet: userId,
                level: 6,
                referrerId: "",
                registrationTime: Date.now(),
                isActive: true,
                cardCount: 0,
                totalEarned: 0
            };
        }
        
        // ✅ ПРОВЕРЯЕМ ВСЕХ СОАВТОРОВ
        const isCoauthor = ALL_FOUNDERS.slice(1).some(addr => 
            addr.toLowerCase() === userId.toLowerCase()
        );
        
        if (isCoauthor) {
            const founderIndex = ALL_FOUNDERS.findIndex(addr => 
                addr.toLowerCase() === userId.toLowerCase()
            );
            console.log(`🤝 Co-author ${founderIndex} detected - manager access granted`);
            return {
                userId: `COAUTHOR_${founderIndex}`,
                wallet: userId,
                level: 5,
                referrerId: "",
                registrationTime: Date.now(),
                isActive: true,
                cardCount: 0,
                totalEarned: 0
            };
        }
        
        // ✅ ОБЫЧНАЯ ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ
        const result = await this.contract.methods.users(userId).call();
        
        if (!result[0] || result[0] === "") {
            throw new Error('User not registered');
        }
            
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
