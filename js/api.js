// CardGift API - WEB3 + контент-фильтры + лимиты пользователей
class CardGiftAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.isWeb3Mode = true;
        this.fallbackToLocal = true;
        
        // Загружаем конфигурацию
        this.config = window.CONTRACT_CONFIG || null;
        
        // Криптография
        this.cryptoConfig = {
            algorithm: 'AES-GCM',
            keyLength: 256,
            ivLength: 12,
            tagLength: 16,
            iterations: 100000,
            hashAlgorithm: 'SHA-256'
        };
        
        // Rate limiting
        this.rateLimits = new Map();
        this.maxRequestsPerMinute = 60;
        
        // Кеширование
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 минут
        
        // ✅ НОВОЕ: Контент-фильтры
        this.bannedWords = [
            // Русские запрещенные слова
            'порно', 'секс', 'эротика', 'xxx', 'сука', 'блядь', 'пизда', 'хуй', 'ебать', 'гомосек', 
            'педик', 'пидор', 'долбоеб', 'мудак', 'сволочь', 'тварь', 'сучка', 'шлюха', 'дрочить',
            'насилие', 'убить', 'убийство', 'смерть', 'самоубийство', 'терроризм', 'взрыв', 'бомба',
            'наркотики', 'кокаин', 'героин', 'марихуана', 'амфетамин', 'экстази', 'мефедрон',
            // Английские запрещенные слова  
            'porn', 'sex', 'nude', 'naked', 'fuck', 'shit', 'bitch', 'whore', 'slut', 'gay', 'homo',
            'nigger', 'faggot', 'retard', 'kill', 'murder', 'suicide', 'bomb', 'terror', 'rape',
            'drugs', 'cocaine', 'heroin', 'marijuana', 'cannabis', 'meth', 'ecstasy'
        ];
        
        // ✅ НОВОЕ: Лимиты пользователей (из config)
        this.userLimits = this.config ? this.config.STORAGE_LIMITS : {
            FREE: 5,
            ACTIVATED: 20,
            MINI_ADMIN: 50,
            SUPER_ADMIN: 100
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Проверяем Web3
            if (typeof walletManager !== 'undefined') {
                await walletManager.initWeb3();
                console.log('✅ WEB3 режим активирован');
            } else {
                console.warn('⚠️ WEB3 недоступен, работаем в локальном режиме');
                this.isWeb3Mode = false;
            }
            
            // Инициализация криптографии
            await this.initCrypto();
            
            // Очистка старого кеша
            this.cleanupCache();
            
        } catch (error) {
            console.error('❌ Ошибка инициализации API:', error);
            this.isWeb3Mode = false;
        }
    }
    
    // Инициализация криптографии
    async initCrypto() {
        try {
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API не поддерживается');
            }
            
            this.sessionKey = await this.generateSessionKey();
            console.log('✅ Криптография инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации криптографии:', error);
            this.sessionKey = null;
        }
    }
    
    // Генерация мастер-ключа сессии
    async generateSessionKey() {
        try {
            return await window.crypto.subtle.generateKey(
                {
                    name: this.cryptoConfig.algorithm,
                    length: this.cryptoConfig.keyLength
                },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('Ошибка генерации ключа:', error);
            return null;
        }
    }
    
    // ✅ НОВОЕ: Контент-фильтр
    checkContent(text) {
        if (!text || typeof text !== 'string') return { isValid: true, errors: [] };
        
        const errors = [];
        const lowerText = text.toLowerCase();
        
        // Проверяем запрещенные слова
        for (const word of this.bannedWords) {
            if (lowerText.includes(word.toLowerCase())) {
                errors.push(`Обнаружено недопустимое содержание: "${word}"`);
            }
        }
        
        // Проверяем на спам (много повторяющихся символов)
        if (/(.)\1{10,}/.test(text)) {
            errors.push('Обнаружен спам (повторяющиеся символы)');
        }
        
        // Проверяем длину
        if (text.length > 5000) {
            errors.push('Текст слишком длинный (максимум 5000 символов)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // ✅ НОВОЕ: Проверка лимитов пользователя
    async checkUserLimit(userId) {
    console.log('🔍 Начинаем проверку лимитов для userId:', userId);
    
    // СНАЧАЛА ПРОВЕРЯЕМ КОШЕЛЕК АДМИНА
    let currentWallet = null;
    
    try {
        if (walletManager && walletManager.currentAccount) {
            currentWallet = walletManager.currentAccount.toLowerCase();
        } else if (window.ethereum && window.ethereum.selectedAddress) {
            currentWallet = window.ethereum.selectedAddress.toLowerCase();
        }
        
        console.log('🔍 Текущий кошелек:', currentWallet);
        
        // ТВОЙ ГЛАВНЫЙ КОШЕЛЕК - БЕЗЛИМИТНЫЙ ДОСТУП
        if (currentWallet === '0x7a58c0be72be218b41c608b7fe7c5bb630736c71') {
            console.log('🔥 ГЛАВНЫЙ АДМИН ОБНАРУЖЕН - безлимитный доступ!');
            return {
                canCreate: true,
                currentCount: 0,
                limit: 999999,
                userLevel: 'SUPER_ADMIN',
                remaining: 999999
            };
        }
        
        // Центральный основатель тоже безлимитный
        if (currentWallet === '0x0099188030174e381e7a7ee36d2783ecc31b6728') {
            console.log('🔥 ЦЕНТРАЛЬНЫЙ ОСНОВАТЕЛЬ - безлимитный доступ!');
            return {
                canCreate: true,
                currentCount: 0,
                limit: 999999,
                userLevel: 'SUPER_ADMIN',
                remaining: 999999
            };
        }
        
    } catch (walletError) {
        console.warn('⚠️ Ошибка получения кошелька:', walletError);
    }
    
    // Для всех остальных - стандартная проверка
    try {
        // Даем базовый лимит для обычных пользователей
        return {
            canCreate: true,
            currentCount: 0,
            limit: 5,
            userLevel: 'FREE',
            remaining: 5
        };
        
    } catch (error) {
        console.error('❌ Общая ошибка проверки лимитов:', error);
        
        // ПОСЛЕДНЯЯ ПРОВЕРКА ДЛЯ ТВОЕГО КОШЕЛЬКА
        if (currentWallet === '0x7a58c0be72be218b41c608b7fe7c5bb630736c71') {
            return {
                canCreate: true,
                currentCount: 0,
                limit: 999999,
                userLevel: 'SUPER_ADMIN',
                remaining: 999999
            };
        }
        
        return {
            canCreate: false,
            currentCount: 0,
            limit: 5,
            userLevel: 'FREE',
            remaining: 0
        };
    }
}
    
    // Rate limiting проверка
    checkRateLimit(action) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const key = `${action}_${minute}`;
        
        const current = this.rateLimits.get(key) || 0;
        if (current >= this.maxRequestsPerMinute) {
            throw new Error(`Превышен лимит запросов для ${action}`);
        }
        
        this.rateLimits.set(key, current + 1);
        
        // Очистка старых записей
        for (const [limitKey, _] of this.rateLimits) {
            const keyMinute = parseInt(limitKey.split('_').pop());
            if (keyMinute < minute - 2) {
                this.rateLimits.delete(limitKey);
            }
        }
    }
    
    // Безопасное шифрование данных
    async encryptData(data, password = null) {
        try {
            if (!this.sessionKey && !password) {
                return this.legacyEncrypt(data);
            }
            
            const textData = JSON.stringify(data);
            const encodedData = new TextEncoder().encode(textData);
            
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(this.cryptoConfig.ivLength));
            
            let key = this.sessionKey;
            
            if (password) {
                const passwordKey = await this.deriveKeyFromPassword(password, salt);
                key = passwordKey;
            }
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: this.cryptoConfig.algorithm,
                    iv: iv
                },
                key,
                encodedData
            );
            
            const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encrypted), salt.length + iv.length);
            
            return this.arrayBufferToBase64(result);
            
        } catch (error) {
            console.error('Ошибка шифрования:', error);
            return this.legacyEncrypt(data);
        }
    }
    
    // Безопасная расшифровка данных
    async decryptData(encryptedData, password = null) {
        try {
            if (!this.sessionKey && !password) {
                return this.legacyDecrypt(encryptedData);
            }
            
            const combined = this.base64ToArrayBuffer(encryptedData);
            
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 16 + this.cryptoConfig.ivLength);
            const encrypted = combined.slice(16 + this.cryptoConfig.ivLength);
            
            let key = this.sessionKey;
            
            if (password) {
                const passwordKey = await this.deriveKeyFromPassword(password, salt);
                key = passwordKey;
            }
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: this.cryptoConfig.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );
            
            const textData = new TextDecoder().decode(decrypted);
            return JSON.parse(textData);
            
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            return this.legacyDecrypt(encryptedData);
        }
    }
    
    // Создание ключа из пароля
    async deriveKeyFromPassword(password, salt) {
        const passwordKey = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.cryptoConfig.iterations,
                hash: this.cryptoConfig.hashAlgorithm
            },
            passwordKey,
            {
                name: this.cryptoConfig.algorithm,
                length: this.cryptoConfig.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Создание криптографического хеша
    async createSecureHash(data) {
        try {
            const textData = typeof data === 'string' ? data : JSON.stringify(data);
            const encodedData = new TextEncoder().encode(textData);
            
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Ошибка создания хеша:', error);
            return this.legacyHash(data);
        }
    }
    
    // ✅ УЛУЧШЕННАЯ: Валидация данных пользователя
    validateUserData(userData) {
        const required = ['name', 'messenger', 'contact'];
        const errors = [];
        
        // Проверка обязательных полей
        for (const field of required) {
            if (!userData[field] || userData[field].trim().length === 0) {
                errors.push(`Поле ${field} обязательно`);
            }
        }
        
        // Валидация имени
        if (userData.name) {
            if (userData.name.length > 50) {
                errors.push('Имя не должно превышать 50 символов');
            }
            
            // Проверяем имя на недопустимый контент
            const nameCheck = this.checkContent(userData.name);
            if (!nameCheck.isValid) {
                errors.push(...nameCheck.errors);
            }
        }
        
        // Валидация контакта по типу мессенджера
        if (userData.contact && userData.messenger) {
            const contactValid = this.validateContactByMessenger(
                userData.contact, 
                userData.messenger
            );
            if (!contactValid) {
                errors.push(`Некорректный формат контакта для ${userData.messenger}`);
            }
        }
        
        // Валидация реферального ID
        if (userData.referralId && !/^\d{7}$/.test(userData.referralId)) {
            errors.push('Реферальный ID должен содержать 7 цифр');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Валидация контакта по мессенджеру
    validateContactByMessenger(contact, messenger) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            telegram: /^(@[a-zA-Z0-9_]{5,32}|\+\d{10,15})$/,
            whatsapp: /^\+\d{10,15}$/,
            viber: /^\+\d{10,15}$/,
            instagram: /^@[a-zA-Z0-9_.]{1,30}$/,
            facebook: /.{3,}/,
            tiktok: /^@?[a-zA-Z0-9_.]{1,24}$/,
            twitter: /^@?[a-zA-Z0-9_]{1,15}$/
        };
        
        const pattern = patterns[messenger];
        return pattern ? pattern.test(contact) : contact.length >= 3;
    }
    
    // ✅ УЛУЧШЕННАЯ: Санитизация данных
    sanitizeData(data) {
        if (typeof data === 'string') {
            return data
                .trim()
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '') // Удаляем все HTML теги
                .replace(/javascript:/gi, '') // Удаляем javascript: ссылки
                .replace(/on\w+=/gi, '') // Удаляем обработчики событий
                .substring(0, 1000); // Ограничение длины
        }
        
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                sanitized[key] = this.sanitizeData(value);
            }
            return sanitized;
        }
        
        return data;
    }
    
    // ГЕНЕРАЦИЯ ID (криптографически стойкая)
    generateUserId() {
        try {
            const array = new Uint32Array(2);
            window.crypto.getRandomValues(array);
            
            const randomNum = (array[0] % 9000000) + 1000000; // 7 цифр
            return randomNum.toString();
        } catch (error) {
            // Fallback
            return Math.floor(1000000 + Math.random() * 9000000).toString();
        }
    }
    
    // ✅ УЛУЧШЕННАЯ: РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
    async registerUser(userData) {
        try {
            this.checkRateLimit('register');
            
            // Санитизация входных данных
            const sanitizedData = this.sanitizeData(userData);
            
            // Валидация
            const validation = this.validateUserData(sanitizedData);
            if (!validation.isValid) {
                throw new Error(`Ошибка валидации: ${validation.errors.join(', ')}`);
            }
            
            const { name, messenger, contact, referralId, walletAddress } = sanitizedData;
            
            // Генерируем ID
            const userId = this.generateUserId();
            
            // Подготавливаем данные
            const userObject = {
                userId: userId,
                name: name,
                messenger: messenger,
                contact: contact,
                referralId: referralId || '',
                walletAddress: walletAddress || '',
                registrationDate: new Date().toISOString(),
                level: 0,
                isActive: false,
                cardCount: 0,
                dataHash: await cardGiftAPI.createSecureHash(`${userId}${name}${contact}`)
            };
            
            // WEB3 регистрация
            if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
                try {
                    // Регистрируем в блокчейне
                    const txResult = await walletManager.registerUser(referralId);
                    
                    // Добавляем данные транзакции
                    userObject.txHash = txResult.transactionHash;
                    userObject.blockNumber = txResult.blockNumber;
                    
                    console.log('✅ Пользователь зарегистрирован в блокчейне:', txResult);
                } catch (web3Error) {
                    console.warn('⚠️ Ошибка регистрации в блокчейне, сохраняем локально:', web3Error);
                }
            }
            
            // Локальное сохранение
            await this.saveToLocalStorage('currentUser', userObject);
            
            // Добавляем в общий список пользователей
            const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
            allUsers.push(userObject);
            await this.saveToLocalStorage('registeredUsers', allUsers);
            
            // Обновляем реферальную статистику
            if (referralId) {
                await this.updateReferralStats(referralId, userId);
            }
            
            // Логирование
            this.logSecurityEvent('user_registered', {
                userId: userId,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            
            return {
                success: true,
                userId: userId,
                message: 'Регистрация успешна!'
            };
            
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            
            this.logSecurityEvent('registration_failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: false,
                error: error.message || 'Ошибка регистрации'
            };
        }
    }
    
    // ✅ УЛУЧШЕННАЯ: СОЗДАНИЕ ОТКРЫТКИ
    async createCard(formData) {
        try {
            this.checkRateLimit('createCard');
            
            const userId = formData.get('userId');
            if (!userId) {
                throw new Error('ID пользователя не указан');
            }
            
            // ✅ ПРОВЕРЯЕМ ЛИМИТЫ ПОЛЬЗОВАТЕЛЯ
            const limitCheck = await this.checkUserLimit(userId);
            if (!limitCheck.canCreate) {
                throw new Error(`Достигнут лимит открыток (${limitCheck.currentCount}/${limitCheck.limit}) для уровня ${limitCheck.userLevel}`);
            }
            
            // Генерируем ID открытки
            const cardId = 'card_' + Date.now() + '_' + this.generateUserId();
            
            // Получаем и проверяем контент
            const greeting = this.sanitizeData(formData.get('greeting') || '');
            const personalMessage = this.sanitizeData(formData.get('personalMessage') || '');
            
            // ✅ ПРОВЕРЯЕМ КОНТЕНТ НА НЕДОПУСТИМОЕ СОДЕРЖАНИЕ
            const greetingCheck = this.checkContent(greeting);
            if (!greetingCheck.isValid) {
                throw new Error(`Недопустимое содержание в поздравлении: ${greetingCheck.errors.join(', ')}`);
            }
            
            const messageCheck = this.checkContent(personalMessage);
            if (!messageCheck.isValid) {
                throw new Error(`Недопустимое содержание в сообщении: ${messageCheck.errors.join(', ')}`);
            }
            
            // Подготавливаем метаданные
            const cardMetadata = {
                cardId: cardId,
                userId: userId,
                greeting: greeting,
                personalMessage: personalMessage,
                videoUrl: this.sanitizeData(formData.get('videoUrl') || ''),
                style: formData.get('style') || 'classic',
                textPosition: formData.get('textPosition') || 'bottom',
                qrEnabled: formData.get('qrEnabled') === 'true',
                qrUrl: this.sanitizeData(formData.get('qrUrl') || ''),
                qrPosition: formData.get('qrPosition') || 'bottomRight',
                qrSize: parseInt(formData.get('qrSize')) || 100,
                ctaEnabled: formData.get('ctaEnabled') === 'true',
                ctaTitle: this.sanitizeData(formData.get('ctaTitle') || ''),
                ctaButton: this.sanitizeData(formData.get('ctaButton') || ''),
                ctaUrl: this.sanitizeData(formData.get('ctaUrl') || ''),
                ctaPosition: formData.get('ctaPosition') || 'bottom',
                bannerEnabled: formData.get('bannerEnabled') === 'true',
                bannerHtml: this.sanitizeData(formData.get('bannerHtml') || ''),
                bannerUrl: this.sanitizeData(formData.get('bannerUrl') || ''),
                timers: formData.get('timers') || '{"message":0,"button":3,"banner":5}',
                createdAt: new Date().toISOString(),
                viewCount: 0,
                isArchived: false
            };
            
            // Создаем хеш метаданных
            cardMetadata.contentHash = await cardGiftAPI.createSecureHash(cardMetadata);
            
            // Обрабатываем медиа файл
            const mediaFile = formData.get('media');
            if (mediaFile && mediaFile.size > 0) {
                // Проверка размера и типа файла
                if (mediaFile.size > 10 * 1024 * 1024) { // 10MB
                    throw new Error('Файл слишком большой (максимум 10MB)');
                }
                
                const allowedTypes = ['image/', 'video/'];
                if (!allowedTypes.some(type => mediaFile.type.startsWith(type))) {
                    throw new Error('Неподдерживаемый тип файла');
                }
                
                // Сохраняем как base64 для демо
                const mediaBase64 = await this.fileToBase64(mediaFile);
                cardMetadata.mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
                cardMetadata.mediaUrl = mediaBase64;
            }
            
            // WEB3 сохранение
            if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
                try {
                    // Создаем хеш метаданных для блокчейна
                    const metadataString = JSON.stringify(cardMetadata);
                    const metadataHash = await cardGiftAPI.createSecureHash(metadataString);
                    
                    // Сохраняем в блокчейне
                    const txResult = await walletManager.createCard(metadataHash);
                    cardMetadata.txHash = txResult.transactionHash;
                    cardMetadata.blockNumber = txResult.blockNumber;
                    
                    console.log('✅ Открытка создана в блокчейне:', txResult);
                } catch (web3Error) {
                    console.warn('⚠️ Ошибка создания в блокчейне, сохраняем локально:', web3Error);
                }
            }
            
            // Локальное сохранение
            await this.saveCardLocally(cardMetadata);
            
            // ✅ ОБНОВЛЯЕМ СЧЕТЧИК ОТКРЫТОК ПОЛЬЗОВАТЕЛЯ
            await this.updateUserCardCount(userId, 1);
            
            this.logSecurityEvent('card_created', {
                cardId: cardId,
                userId: userId,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                cardId: cardId,
                viewUrl: `/card-viewer.html?id=${cardId}`,
                message: 'Открытка создана успешно!'
            };
            
        } catch (error) {
            console.error('❌ Ошибка создания открытки:', error);
            return {
                success: false,
                error: error.message || 'Ошибка создания открытки'
            };
        }
    }
    
    // ✅ НОВОЕ: Обновление счетчика открыток пользователя
    async updateUserCardCount(userId, increment) {
        try {
            // Обновляем текущего пользователя
            const currentUser = await this.getFromLocalStorage('currentUser');
            if (currentUser && currentUser.userId === userId) {
                currentUser.cardCount = (currentUser.cardCount || 0) + increment;
                await this.saveToLocalStorage('currentUser', currentUser);
            }
            
            // Обновляем в общем списке
            const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
            const userIndex = allUsers.findIndex(u => u.userId === userId);
            if (userIndex !== -1) {
                allUsers[userIndex].cardCount = (allUsers[userIndex].cardCount || 0) + increment;
                await this.saveToLocalStorage('registeredUsers', allUsers);
            }
            
            // Очищаем кеш пользователя
            this.cache.delete(`user_${userId}`);
            
        } catch (error) {
            console.error('❌ Ошибка обновления счетчика открыток:', error);
        }
    }
    
    // ✅ НОВОЕ: Удаление открытки
    async deleteCard(cardId, userId) {
        try {
            this.checkRateLimit('deleteCard');
            
            if (!cardId || !userId) {
                throw new Error('Не указан ID открытки или пользователя');
            }
            
            // Получаем открытку
            const card = await this.getCard(cardId);
            if (!card) {
                throw new Error('Открытка не найдена');
            }
            
            // Проверяем права доступа
            if (card.userId !== userId) {
                throw new Error('Нет прав для удаления этой открытки');
            }
            
            // WEB3 удаление (помечаем как архивированную)
            if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
                try {
                    await walletManager.deleteCard(cardId);
                    console.log('✅ Открытка помечена как удаленная в блокчейне');
                } catch (web3Error) {
                    console.warn('⚠️ Ошибка удаления в блокчейне:', web3Error);
                }
            }
            
            // Локальное удаление
            await this.removeCardLocally(cardId, userId);
            
            // Обновляем счетчик
            await this.updateUserCardCount(userId, -1);
            
            this.logSecurityEvent('card_deleted', {
                cardId: cardId,
                userId: userId,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: true,
                message: 'Открытка удалена'
            };
            
        } catch (error) {
            console.error('❌ Ошибка удаления открытки:', error);
            return {
                success: false,
                error: error.message || 'Ошибка удаления открытки'
            };
        }
    }
    
    // Удаление открытки локально
    async removeCardLocally(cardId, userId) {
        try {
            // Удаляем из карточек пользователя
            let userCards = await this.getFromLocalStorage('userCards') || {};
            if (userCards[userId]) {
                userCards[userId] = userCards[userId].filter(card => card.cardId !== cardId);
                await this.saveToLocalStorage('userCards', userCards);
            }
            
            // Помечаем как удаленную в общем хранилище
            let allCards = await this.getFromLocalStorage('allCards') || [];
            const cardIndex = allCards.findIndex(card => card.cardId === cardId);
            if (cardIndex !== -1) {
                allCards[cardIndex].isArchived = true;
                allCards[cardIndex].deletedAt = new Date().toISOString();
                await this.saveToLocalStorage('allCards', allCards);
            }
            
            // Очищаем кеш
            this.cache.delete(`card_${cardId}`);
            
        } catch (error) {
            console.error('❌ Ошибка локального удаления открытки:', error);
        }
    }
    
    // Получение открыток пользователя
   async getUserCards(userId) {
       try {
           // Проверяем кеш
           const cacheKey = `user_cards_${userId}`;
           const cached = this.getCacheItem(cacheKey);
           if (cached) {
               return cached;
           }
           
           let userCards = [];
           
           // WEB3 данные
           if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
               try {
                   const web3Cards = await walletManager.getUserCards(userId);
                   
                   // Получаем детальную информацию по каждой открытке
                   for (const cardId of web3Cards) {
                       try {
                           const card = await this.getCard(cardId);
                           if (card && !card.isArchived) {
                               userCards.push(card);
                           }
                       } catch (error) {
                           console.warn(`Не удалось загрузить открытку ${cardId}:`, error);
                       }
                   }
               } catch (web3Error) {
                   console.warn('⚠️ Ошибка загрузки открыток из блокчейна:', web3Error);
               }
           }
           
           // Дополняем локальными данными
           const localUserCards = await this.getFromLocalStorage('userCards') || {};
           const localCards = localUserCards[userId] || [];
           
           // Объединяем и убираем дубликаты
           localCards.forEach(localCard => {
               if (!userCards.find(card => card.cardId === localCard.cardId) && !localCard.isArchived) {
                   userCards.push(localCard);
               }
           });
           
           // Сортируем по дате создания (новые первые)
           userCards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
           
           // Кешируем результат
           this.setCacheItem(cacheKey, userCards, 2 * 60 * 1000); // 2 минуты кеш
           
           return userCards;
           
       } catch (error) {
           console.error('❌ Ошибка получения открыток пользователя:', error);
           return [];
       }
   }
   
   // Получение открытки по ID (с кешированием)
   async getCard(cardId) {
       try {
           // Проверяем кеш
           const cacheKey = `card_${cardId}`;
           const cached = this.getCacheItem(cacheKey);
           if (cached) {
               return cached;
           }
           
           // Сначала ищем локально
           const localCards = await this.getFromLocalStorage('userCards') || {};
           
           // Ищем во всех пользователях
           for (const userId in localCards) {
               const userCards = localCards[userId] || [];
               const card = userCards.find(c => c.cardId === cardId);
               if (card) {
                   this.setCacheItem(cacheKey, card);
                   return card;
               }
           }
           
           // Ищем в общем хранилище
           const allCards = await this.getFromLocalStorage('allCards') || [];
           const card = allCards.find(c => c.cardId === cardId);
           
           if (card) {
               this.setCacheItem(cacheKey, card);
               return card;
           }
           
           throw new Error('Открытка не найдена');
           
       } catch (error) {
           console.error('❌ Ошибка получения открытки:', error);
           throw error;
       }
   }
   
   // АКТИВАЦИЯ ПОЛЬЗОВАТЕЛЯ
   async activateUser(userId, activationData = {}) {
       try {
           this.checkRateLimit('activate');
           
           if (!this.isWeb3Mode || !walletManager || !walletManager.isWalletConnected()) {
               throw new Error('Требуется подключение кошелька для активации');
           }
           
           const { level, walletAddress, txHash } = activationData;
           
           // Обновляем локальные данные
           const currentUser = await this.getFromLocalStorage('currentUser');
           if (currentUser && currentUser.userId === userId) {
               currentUser.level = level || 1;
               currentUser.isActive = true;
               currentUser.walletAddress = walletAddress;
               currentUser.activationTxHash = txHash;
               currentUser.activationDate = new Date().toISOString();
               
               await this.saveToLocalStorage('currentUser', currentUser);
           }
           
           // Обновляем в общем списке
           const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
           const userIndex = allUsers.findIndex(u => u.userId === userId);
           if (userIndex !== -1) {
               allUsers[userIndex] = { ...allUsers[userIndex], ...currentUser };
               await this.saveToLocalStorage('registeredUsers', allUsers);
           }
           
           this.logSecurityEvent('user_activated', {
               userId: userId,
               level: level,
               timestamp: new Date().toISOString()
           });
           
           return {
               success: true,
               message: 'Активация успешна!'
           };
           
       } catch (error) {
           console.error('❌ Ошибка активации:', error);
           throw error;
       }
   }
   
   // ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ (с кешированием)
   async getUser(userId) {
       try {
           // Проверяем кеш
           const cacheKey = `user_${userId}`;
           const cached = this.getCacheItem(cacheKey);
           if (cached) {
               return cached;
           }
           
           // Сначала пробуем WEB3
           if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
               try {
                   const web3User = await walletManager.getUser(userId);
                   
                   // Объединяем с локальными данными
                   const localUser = await this.getFromLocalStorage('currentUser');
                   if (localUser && localUser.userId === userId) {
                       const combined = { ...localUser, ...web3User };
                       this.setCacheItem(cacheKey, combined);
                       return combined;
                   }
                   
                   this.setCacheItem(cacheKey, web3User);
                   return web3User;
               } catch (web3Error) {
                   console.warn('⚠️ Не удалось загрузить из блокчейна, используем локальные данные');
               }
           }
           
           // Fallback на локальные данные
           const currentUser = await this.getFromLocalStorage('currentUser');
           if (currentUser && currentUser.userId === userId) {
               this.setCacheItem(cacheKey, currentUser);
               return currentUser;
           }
           
           // Ищем в общем списке
           const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
           const user = allUsers.find(u => u.userId === userId);
           
           if (user) {
               this.setCacheItem(cacheKey, user);
               return user;
           }
           
           throw new Error('Пользователь не найден');
           
       } catch (error) {
           console.error('❌ Ошибка получения пользователя:', error);
           throw error;
       }
   }
   
   // ПОЛУЧЕНИЕ РЕФЕРАЛОВ ПОЛЬЗОВАТЕЛЯ
   async getUserReferrals(userId) {
       try {
           this.checkRateLimit('getReferrals');
           
           // Проверяем кеш
           const cacheKey = `referrals_${userId}`;
           const cached = this.getCacheItem(cacheKey);
           if (cached) {
               return cached;
           }
           
           let referrals = [];
           
           // WEB3 данные
           if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
               try {
                   const web3Referrals = await walletManager.getUserReferrals(userId);
                   
                   // Получаем детальную информацию по каждому рефералу
                   for (const refId of web3Referrals) {
                       try {
                           const refUser = await this.getUser(refId);
                           referrals.push(refUser);
                       } catch (error) {
                           console.warn(`Не удалось загрузить реферала ${refId}:`, error);
                       }
                   }
               } catch (web3Error) {
                   console.warn('⚠️ Ошибка загрузки рефералов из блокчейна:', web3Error);
               }
           }
           
           // Дополняем локальными данными
           const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
           const localReferrals = allUsers.filter(user => user.referralId === userId);
           
           // Объединяем и убираем дубликаты
           const allReferrals = [...referrals];
           localReferrals.forEach(localRef => {
               if (!allReferrals.find(ref => ref.userId === localRef.userId)) {
                   allReferrals.push(localRef);
               }
           });
           
           // Считаем статистику
           const now = new Date();
           const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
           const activeThisMonth = allReferrals.filter(ref => 
               new Date(ref.registrationDate) >= thisMonth
           ).length;
           
           const result = {
               total: allReferrals.length,
               activeThisMonth: activeThisMonth,
               directReferrals: allReferrals,
               earnings: 0 // TODO: Подсчет из блокчейна
           };
           
           // Кешируем результат
           this.setCacheItem(cacheKey, result, 2 * 60 * 1000); // 2 минуты кеш
           
           return result;
           
       } catch (error) {
           console.error('❌ Ошибка получения рефералов:', error);
           return {
               total: 0,
               activeThisMonth: 0,
               directReferrals: [],
               earnings: 0
           };
       }
   }
   
   // ПОЛУЧЕНИЕ КОНТАКТОВ ПОЛЬЗОВАТЕЛЯ (для админки)
   async getUserContacts(userId) {
       try {
           this.checkRateLimit('getContacts');
           
           const user = await this.getUser(userId);
           
           if (!user || user.level < 2) {
               throw new Error('Недостаточно прав доступа');
           }
           
           // WEB3 данные
           if (this.isWeb3Mode && walletManager && walletManager.isWalletConnected()) {
               try {
                   const encryptedData = await walletManager.getUserEncryptedData(userId);
                   if (encryptedData) {
                       const decryptedData = await this.decryptData(encryptedData);
                       if (decryptedData) {
                           return this.formatContactsData(decryptedData);
                       }
                   }
               } catch (web3Error) {
                   console.warn('⚠️ Ошибка загрузки контактов из блокчейна:', web3Error);
               }
           }
           
           // Локальные данные
           const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
           const userReferrals = allUsers.filter(u => u.referralId === userId);
           
           return this.formatContactsData(userReferrals);
           
       } catch (error) {
           console.error('❌ Ошибка получения контактов:', error);
           throw error;
       }
   }
   
   // ОБНОВЛЕНИЕ РЕФЕРАЛЬНОЙ СТАТИСТИКИ
   async updateReferralStats(referrerId, newUserId) {
       try {
           let stats = await this.getFromLocalStorage('referralStats') || {};
           
           if (!stats[referrerId]) {
               stats[referrerId] = {
                   total: 0,
                   thisMonth: 0,
                   referrals: []
               };
           }
           
           stats[referrerId].total++;
           stats[referrerId].referrals.push({
               userId: newUserId,
               date: new Date().toISOString()
           });
           
           // Подсчитываем за текущий месяц
           const thisMonth = new Date();
           thisMonth.setDate(1);
           thisMonth.setHours(0, 0, 0, 0);
           
           stats[referrerId].thisMonth = stats[referrerId].referrals.filter(ref => 
               new Date(ref.date) >= thisMonth
           ).length;
           
           await this.saveToLocalStorage('referralStats', stats);
           
           // Очищаем кеш рефералов
           this.cache.delete(`referrals_${referrerId}`);
           
       } catch (error) {
           console.error('❌ Ошибка обновления статистики рефералов:', error);
       }
   }
   
   // СОХРАНЕНИЕ ОТКРЫТКИ ЛОКАЛЬНО
   async saveCardLocally(cardData) {
       try {
           const userId = cardData.userId;
           
           // Сохраняем в карточках пользователя
           let userCards = await this.getFromLocalStorage('userCards') || {};
           if (!userCards[userId]) {
               userCards[userId] = [];
           }
           userCards[userId].push(cardData);
           await this.saveToLocalStorage('userCards', userCards);
           
           // Сохраняем в общем хранилище
           let allCards = await this.getFromLocalStorage('allCards') || [];
           allCards.push(cardData);
           await this.saveToLocalStorage('allCards', allCards);
           
           // Очищаем кеш
           this.cache.delete(`card_${cardData.cardId}`);
           this.cache.delete(`user_cards_${userId}`);
           
       } catch (error) {
           console.error('❌ Ошибка сохранения открытки:', error);
       }
   }
   
   // ФОРМАТИРОВАНИЕ ДАННЫХ КОНТАКТОВ
   formatContactsData(contacts) {
       const formatted = {};
       
       if (Array.isArray(contacts)) {
           contacts.forEach(contact => {
               const messenger = contact.messenger || 'unknown';
               if (!formatted[messenger]) {
                   formatted[messenger] = [];
               }
               formatted[messenger].push({
                   userId: contact.userId || '',
                   name: contact.name || '',
                   contact: contact.contact || '',
                   registrationDate: contact.registrationDate || new Date().toISOString(),
                   level: contact.level || 0,
                   referralId: contact.referralId || '',
                   dataHash: contact.dataHash || ''
               });
           });
       }
       
       return formatted;
   }
   
   // Логирование событий безопасности
   logSecurityEvent(event, data) {
       try {
           const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
           logs.push({
               event: event,
               data: data,
               timestamp: new Date().toISOString()
           });
           
           // Оставляем только последние 100 записей
           if (logs.length > 100) {
               logs.splice(0, logs.length - 100);
           }
           
           localStorage.setItem('securityLogs', JSON.stringify(logs));
       } catch (error) {
           console.warn('Не удалось записать лог безопасности:', error);
       }
   }
   
   // Очистка кеша
   cleanupCache() {
       const now = Date.now();
       for (const [key, data] of this.cache) {
           if (now - data.timestamp > data.ttl) {
               this.cache.delete(key);
           }
       }
   }
   
   // Кеширование с TTL
   setCacheItem(key, value, ttl = this.cacheTimeout) {
       this.cache.set(key, {
           value: value,
           timestamp: Date.now(),
           ttl: ttl
       });
   }
   
   getCacheItem(key) {
       const item = this.cache.get(key);
       if (!item) return null;
       
       const now = Date.now();
       if (now - item.timestamp > item.ttl) {
           this.cache.delete(key);
           return null;
       }
       
       return item.value;
   }
   
   // Резервное копирование данных
   async backupUserData(userId) {
       try {
           const user = await this.getUser(userId);
           const referrals = await this.getUserReferrals(userId);
           const userCards = await this.getUserCards(userId);
           
           const backup = {
               version: '1.0.0',
               timestamp: new Date().toISOString(),
               user: user,
               referrals: referrals,
               cards: userCards,
               checksum: await cardGiftAPI.createSecureHash({ user, referrals, userCards })
           };
           
           return backup;
       } catch (error) {
           console.error('❌ Ошибка создания резервной копии:', error);
           throw error;
       }
   }
   
   // Восстановление данных
   async restoreUserData(backupData, userId) {
       try {
           // Проверяем целостность
           const expectedChecksum = await cardGiftAPI.createSecureHash({
               user: backupData.user,
               referrals: backupData.referrals,
               userCards: backupData.cards
           });
           
           if (expectedChecksum !== backupData.checksum) {
               throw new Error('Резервная копия повреждена');
           }
           
           // Восстанавливаем данные
           await this.saveToLocalStorage('currentUser', backupData.user);
           
           // Очищаем кеш
           this.cache.clear();
           
           this.logSecurityEvent('data_restored', {
               userId: userId,
               timestamp: new Date().toISOString()
           });
           
           return { success: true, message: 'Данные восстановлены' };
           
       } catch (error) {
           console.error('❌ Ошибка восстановления данных:', error);
           throw error;
       }
   }
   
   // Очистка данных пользователя
   async clearUserData(userId) {
       try {
           // Удаляем из кеша
           for (const [key, _] of this.cache) {
               if (key.includes(userId)) {
                   this.cache.delete(key);
               }
           }
           
           // Удаляем локальные данные
           const currentUser = await this.getFromLocalStorage('currentUser');
           if (currentUser && currentUser.userId === userId) {
               localStorage.removeItem('currentUser');
           }
           
           // Удаляем из общего списка
           const allUsers = await this.getFromLocalStorage('registeredUsers') || [];
           const filteredUsers = allUsers.filter(u => u.userId !== userId);
           await this.saveToLocalStorage('registeredUsers', filteredUsers);
           
           // Удаляем карточки пользователя
           const userCards = await this.getFromLocalStorage('userCards') || {};
           delete userCards[userId];
           await this.saveToLocalStorage('userCards', userCards);
           
           this.logSecurityEvent('user_data_cleared', {
               userId: userId,
               timestamp: new Date().toISOString()
           });
           
           return { success: true, message: 'Данные пользователя очищены' };
           
       } catch (error) {
           console.error('❌ Ошибка очистки данных:', error);
           throw error;
       }
   }
   
   // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   
   // Конвертация файла в base64
   fileToBase64(file) {
       return new Promise((resolve, reject) => {
           const reader = new FileReader();
           reader.readAsDataURL(file);
           reader.onload = () => resolve(reader.result);
           reader.onerror = error => reject(error);
       });
   }
   
   // Асинхронное сохранение в localStorage
   async saveToLocalStorage(key, data) {
       return new Promise((resolve, reject) => {
           try {
               // Проверяем размер данных
               const dataString = JSON.stringify(data);
               if (dataString.length > 5 * 1024 * 1024) { // 5MB
                   throw new Error('Данные слишком большие для localStorage');
               }
               
               localStorage.setItem(key, dataString);
               resolve();
           } catch (error) {
               console.error('❌ Ошибка сохранения в localStorage:', error);
               reject(error);
           }
       });
   }
   
   // Асинхронное получение из localStorage
   async getFromLocalStorage(key) {
       return new Promise((resolve) => {
           try {
               const data = localStorage.getItem(key);
               resolve(data ? JSON.parse(data) : null);
           } catch (error) {
               console.error('❌ Ошибка получения из localStorage:', error);
               resolve(null);
           }
       });
   }
   
   // Утилиты для base64
   arrayBufferToBase64(buffer) {
       let binary = '';
       const bytes = new Uint8Array(buffer);
       const len = bytes.byteLength;
       for (let i = 0; i < len; i++) {
           binary += String.fromCharCode(bytes[i]);
       }
       return window.btoa(binary);
   }
   
   base64ToArrayBuffer(base64) {
       const binary_string = window.atob(base64);
       const len = binary_string.length;
       const bytes = new Uint8Array(len);
       for (let i = 0; i < len; i++) {
           bytes[i] = binary_string.charCodeAt(i);
       }
       return bytes.buffer;
   }
   
   // FALLBACK: Простое шифрование (для совместимости)
   legacyEncrypt(data) {
       try {
           return btoa(JSON.stringify(data));
       } catch (error) {
           console.error('Ошибка legacy шифрования:', error);
           return '';
       }
   }
   
   legacyDecrypt(encryptedData) {
       try {
           return JSON.parse(atob(encryptedData));
       } catch (error) {
           console.error('Ошибка legacy расшифровки:', error);
           return null;
       }
   }
   
   // FALLBACK: Простой хеш (для совместимости)
   legacyHash(data) {
       const str = typeof data === 'string' ? data : JSON.stringify(data);
       let hash = 0;
       for (let i = 0; i < str.length; i++) {
           const char = str.charCodeAt(i);
           hash = ((hash << 5) - hash) + char;
           hash = hash & hash; // Convert to 32bit integer
       }
       return hash.toString(16);
   }
   
   // Показать уведомление (улучшенное)
   showNotification(message, type = 'info', duration = 3000) {
       // Создаем уведомление
       const notification = document.createElement('div');
       notification.className = `notification ${type}`;
       notification.textContent = message;
       
       notification.style.cssText = `
           position: fixed;
           bottom: 20px;
           left: 50%;
           transform: translateX(-50%) translateY(100%);
           background: rgba(0, 0, 0, 0.95);
           color: white;
           padding: 16px 28px;
           border-radius: 12px;
           z-index: 9999;
           opacity: 0;
           transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
           border: 1px solid #333;
           max-width: 90%;
           text-align: center;
           font-weight: 500;
           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
           backdrop-filter: blur(8px);
       `;
       
       // Цветовые стили по типу
       if (type === 'success') {
           notification.style.borderColor = '#4CAF50';
           notification.style.background = 'rgba(76, 175, 80, 0.15)';
           notification.style.color = '#4CAF50';
       } else if (type === 'error') {
           notification.style.borderColor = '#f44336';
           notification.style.background = 'rgba(244, 67, 54, 0.15)';
           notification.style.color = '#f44336';
       } else if (type === 'warning') {
           notification.style.borderColor = '#FF9800';
           notification.style.background = 'rgba(255, 152, 0, 0.15)';
           notification.style.color = '#FF9800';
       } else {
           notification.style.borderColor = '#2196F3';
           notification.style.background = 'rgba(33, 150, 243, 0.15)';
           notification.style.color = '#2196F3';
       }
       
       document.body.appendChild(notification);
       
       // Показываем уведомление
       setTimeout(() => {
           notification.style.transform = 'translateX(-50%) translateY(0)';
           notification.style.opacity = '1';
       }, 100);
       
       // Скрываем через заданное время
       setTimeout(() => {
           notification.style.transform = 'translateX(-50%) translateY(100%)';
           notification.style.opacity = '0';
           setTimeout(() => {
               if (notification.parentNode) {
                   notification.parentNode.removeChild(notification);
               }
           }, 400);
       }, duration);
       
       // Клик для закрытия
       notification.addEventListener('click', () => {
           notification.style.transform = 'translateX(-50%) translateY(100%)';
           notification.style.opacity = '0';
           setTimeout(() => {
               if (notification.parentNode) {
                   notification.parentNode.removeChild(notification);
               }
           }, 400);
       });
   }
   
   // Получение статистики безопасности
   getSecurityStats() {
       try {
           const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
           const stats = {
               totalEvents: logs.length,
               registrations: logs.filter(l => l.event === 'user_registered').length,
               activations: logs.filter(l => l.event === 'user_activated').length,
               cardsCreated: logs.filter(l => l.event === 'card_created').length,
               failedRegistrations: logs.filter(l => l.event === 'registration_failed').length,
               lastActivity: logs.length > 0 ? logs[logs.length - 1].timestamp : null
           };
           
           return stats;
       } catch (error) {
           console.error('Ошибка получения статистики безопасности:', error);
           return null;
       }
   }
   
   // Экспорт логов безопасности
   exportSecurityLogs() {
       try {
           const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
           const exportData = {
               version: '1.0.0',
               exportedAt: new Date().toISOString(),
               logs: logs
           };
           
           const blob = new Blob([JSON.stringify(exportData, null, 2)], {
               type: 'application/json'
           });
           
           const url = URL.createObjectURL(blob);
           const link = document.createElement('a');
           link.href = url;
           link.download = `cardgift_security_logs_${new Date().toISOString().split('T')[0]}.json`;
           link.click();
           
           URL.revokeObjectURL(url);
           
           this.showNotification('✅ Логи безопасности экспортированы', 'success');
           
       } catch (error) {
           console.error('Ошибка экспорта логов:', error);
           this.showNotification('❌ Ошибка экспорта логов', 'error');
       }
   }
}

// Создаем глобальный экземпляр API
window.cardGiftAPI = new CardGiftAPI();

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
   module.exports = CardGiftAPI;
}

// Автоматическая очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
   if (window.cardGiftAPI) {
       window.cardGiftAPI.cleanupCache();
   }
});

// Периодическая очистка кеша
setInterval(() => {
   if (window.cardGiftAPI) {
       window.cardGiftAPI.cleanupCache();
   }
}, 5 * 60 * 1000); // Каждые 5 минут
