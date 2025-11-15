// Глобальные переменные
let tg = null;
let user = null;
let currentUserData = null;
let selectedClass = null;

// Переменные для заметок
let notes = [];
let currentEditingNote = null;
let noteColor = '#667eea';

// Переменные для профиля
let nicknameColor = '#667eea';
let pendingLoginUser = null;

// Переменные для мессенджера
let currentChat = null;
let messages = {};
let contacts = [];
let messageSubscriptions = {};
let typingTimer = null;
let amIActive = false;
let currentCall = null;

// Переменные для уведомлений
let notifications = [];
let notificationSubscription = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegramApp();
});

// Инициализация Telegram Web App
async function initializeTelegramApp() {
    try {
        tg = window.Telegram.WebApp;
        
        // Инициализируем приложение
        tg.expand();
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');
        
        // Получаем данные пользователя
        user = tg.initDataUnsafe?.user;
        
        if (user) {
            console.log('Telegram user data:', user);
            await testSupabaseConnection();
            await checkUserRegistration();
        } else {
            console.log('Telegram данные не получены, режим тестирования');
            simulateTelegramUser();
        }
        
    } catch (error) {
        console.error('Ошибка инициализации Telegram:', error);
        simulateTelegramUser();
    }
}

// Функция проверки подключения к Supabase
async function testSupabaseConnection() {
    try {
        console.log('🔌 Проверяем подключение к Supabase...');
        
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Ошибка подключения к Supabase:', error);
            return false;
        }
        
        console.log('✅ Подключение к Supabase успешно');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка тестирования подключения:', error);
        return false;
    }
}

// Проверка регистрации пользователя
async function checkUserRegistration() {
    try {
        displayRegistrationInfo();
        
        const userData = await getUserData(user.id);
        
        if (userData) {
            console.log('✅ Пользователь найден в базе:', userData);
            currentUserData = userData;
            
            if (userData.account_password) {
                console.log('🔐 Требуется пароль');
                await showPasswordLogin(userData);
            } else {
                console.log('🚀 Вход без пароля');
                await completeLogin(userData);
            }
        } else {
            console.log('❌ Пользователь не найден, показываем регистрацию');
            showRegistrationScreen();
        }
        
    } catch (error) {
        console.error('Ошибка проверки регистрации:', error);
        showRegistrationScreen();
    }
}

// Отображение информации на экране регистрации
function displayRegistrationInfo() {
    if (!user) return;
    
    const welcomeText = document.getElementById('regWelcomeText');
    const userTgInfo = document.getElementById('userTgInfo');
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
    userTgInfo.textContent = user.username ? `@${user.username}` : `ID: ${user.id}`;
    
    // Устанавливаем аватар если есть
    if (user.photo_url) {
        document.getElementById('regUserAvatar').src = user.photo_url;
        document.getElementById('regUserAvatar').style.display = 'block';
        document.getElementById('regAvatarPlaceholder').style.display = 'none';
    }
}

// Показать экран регистрации
function showRegistrationScreen() {
    const registrationScreen = document.getElementById('registrationScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (registrationScreen) registrationScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    // Сбрасываем выбор класса
    selectedClass = null;
    updateClassButtons();
    updateRegistrationButton();
}

// Показать главное приложение
function showMainApp() {
    const registrationScreen = document.getElementById('registrationScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (registrationScreen) registrationScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    
    // Инициализируем главное приложение
    setupEventListeners();
    loadMainAppData();
    showSection('news');
    
    // Загружаем уведомления
    loadNotifications();
}

// Загрузка данных для главного приложения
function loadMainAppData() {
    if (!currentUserData) return;
    
    const welcomeText = document.getElementById('welcomeText');
    const userClass = document.getElementById('userClass');
    
    if (welcomeText && userClass) {
        const firstName = currentUserData.first_name || '';
        const lastName = currentUserData.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
        userClass.textContent = `${currentUserData.class} класс`;
        
        // Устанавливаем аватар если есть
        if (user?.photo_url) {
            const userAvatar = document.getElementById('userAvatar');
            const avatarPlaceholder = document.getElementById('avatarPlaceholder');
            if (userAvatar && avatarPlaceholder) {
                userAvatar.src = user.photo_url;
                userAvatar.style.display = 'block';
                avatarPlaceholder.style.display = 'none';
            }
        }
    }
}

// Выбор класса
function selectClass(className) {
    selectedClass = className;
    updateClassButtons();
    updateRegistrationButton();
}

// Обновление кнопок выбора класса
function updateClassButtons() {
    const classButtons = document.querySelectorAll('.class-btn');
    classButtons.forEach(btn => {
        if (btn.textContent.includes(selectedClass)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Обновление кнопки регистрации
function updateRegistrationButton() {
    const regBtn = document.getElementById('completeRegistrationBtn');
    if (!regBtn) return;
    
    if (selectedClass) {
        regBtn.disabled = false;
        regBtn.textContent = `Завершить регистрацию в ${selectedClass} классе`;
    } else {
        regBtn.disabled = true;
        regBtn.textContent = 'Выберите класс для продолжения';
    }
}

// Завершение регистрации
async function completeRegistration() {
    if (!selectedClass || !user) {
        showNotification('Пожалуйста, выберите класс');
        return;
    }
    
    const regBtn = document.getElementById('completeRegistrationBtn');
    if (!regBtn) return;
    
    regBtn.disabled = true;
    regBtn.textContent = 'Регистрируем...';
    
    try {
        // СНАЧАЛА проверяем, не зарегистрирован ли пользователь уже
        const existingUser = await getUserData(user.id);
        
        if (existingUser) {
            console.log('ℹ️ Пользователь уже зарегистрирован, обновляем данные...');
            
            // Обновляем класс пользователя
            const updateData = {
                class: selectedClass,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('telegram_id', user.id)
                .select();
                
            if (error) {
                console.error('❌ Ошибка обновления пользователя:', error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log('✅ Данные пользователя обновлены:', data[0]);
                currentUserData = data[0];
            } else {
                const userData = await getUserData(user.id);
                if (userData) {
                    currentUserData = userData;
                }
            }
            
            if (currentUserData.account_password) {
                console.log('🔐 Требуется пароль для существующего аккаунта');
                regBtn.textContent = '✅ Данные обновлены!';
                
                setTimeout(() => {
                    showPasswordLogin(currentUserData);
                }, 1000);
                return;
            } else {
                regBtn.textContent = '✅ Регистрация успешна!';
                setTimeout(() => {
                    showMainApp();
                }, 1000);
                return;
            }
        }
        
        // Если пользователь не существует, создаем нового
        const userData = {
            telegram_id: user.id,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || '',
            class: selectedClass,
            registration_date: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Создаем нового пользователя:', userData);
        
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();
            
        if (error) {
            console.error('❌ Ошибка регистрации:', error);
            
            if (error.code === '23505') {
                console.log('ℹ️ Пользователь уже зарегистрирован, загружаем данные...');
                const existingUserData = await getUserData(user.id);
                if (existingUserData) {
                    currentUserData = existingUserData;
                    
                    if (currentUserData.account_password) {
                        showPasswordLogin(currentUserData);
                    } else {
                        showMainApp();
                    }
                    return;
                }
            }
            
            throw error;
        }

        if (data && data.length > 0) {
            console.log('✅ Пользователь успешно зарегистрирован:', data[0]);
            currentUserData = data[0];
        } else {
            const userData = await getUserData(user.id);
            if (userData) {
                currentUserData = userData;
            }
        }
        
        regBtn.textContent = '✅ Регистрация успешна!';
        
        setTimeout(() => {
            showMainApp();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Ошибка при регистрации:', error);
        showNotification(`Ошибка регистрации: ${error.message}`);
        regBtn.disabled = false;
        regBtn.textContent = 'Завершить регистрацию';
    }
}

// Получение данных пользователя
async function getUserData(telegramId) {
    try {
        console.log('🔍 Ищем пользователя с ID:', telegramId);
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .limit(1);
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ Пользователь не найден');
                return null;
            }
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Пользователь найден:', data[0]);
            return data[0];
        } else {
            console.log('❌ Пользователь не найден');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Ошибка в getUserData:', error);
        return null;
    }
}

// Настройка обработчиков событий для главного приложения
function setupEventListeners() {
    // Уведомления
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.addEventListener('click', toggleNotifications);
    }
    
    // Закрытие уведомлений при клике вне области
    document.addEventListener('click', function(event) {
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationBell = document.getElementById('notificationBell');
        
        if (notificationsPanel && notificationBell) {
            if (!notificationsPanel.contains(event.target) && !notificationBell.contains(event.target)) {
                closeNotifications();
            }
        }
    });
    
    // Мессенджер
    setupMessengerEventListeners();
}

// ==============================
// СИСТЕМА МЕССЕНДЖЕРА
// ==============================

// Настройка обработчиков событий мессенджера
function setupMessengerEventListeners() {
    // Навигация мессенджера
    const showContactsBtn = document.getElementById('showContactsBtn');
    const showChatsBtn = document.getElementById('showChatsBtn');
    const showCallsBtn = document.getElementById('showCallsBtn');
    
    if (showContactsBtn) showContactsBtn.addEventListener('click', () => showMessengerSection('contacts'));
    if (showChatsBtn) showChatsBtn.addEventListener('click', () => showMessengerSection('chats'));
    if (showCallsBtn) showCallsBtn.addEventListener('click', () => showMessengerSection('calls'));
    
    // Поиск пользователей
    const searchInput = document.getElementById('searchUserInput');
    if (searchInput) searchInput.addEventListener('input', debounce(searchUsers, 300));
    
    // Отправка сообщений
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', handleTyping);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', sendMessage);
    
    // Эмодзи
    const emojiBtn = document.getElementById('emojiBtn');
    if (emojiBtn) emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // Звонки
    const callBtn = document.getElementById('callBtn');
    const acceptCallBtn = document.getElementById('acceptCallBtn');
    const declineCallBtn = document.getElementById('declineCallBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const closeCallModalBtn = document.getElementById('closeCallModal');
    const closeIncomingCallModalBtn = document.getElementById('closeIncomingCallModal');
    
    if (callBtn) callBtn.addEventListener('click', () => startCall('audio'));
    if (acceptCallBtn) acceptCallBtn.addEventListener('click', acceptCall);
    if (declineCallBtn) declineCallBtn.addEventListener('click', declineCall);
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);
    if (closeCallModalBtn) closeCallModalBtn.addEventListener('click', closeCallModal);
    if (closeIncomingCallModalBtn) closeIncomingCallModalBtn.addEventListener('click', closeIncomingCallModal);
    
    // Инициализация палитры эмодзи
    initEmojiPicker();
}

// Инициализация палитры эмодзи
function initEmojiPicker() {
    const emojiPicker = document.getElementById('emojiPicker');
    if (!emojiPicker) return;
    
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', 
                   '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
                   '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'];
    
    emojiPicker.innerHTML = emojis.map(emoji => `
        <span class="emoji" onclick="insertEmoji('${emoji}')">${emoji}</span>
    `).join('');
}

// Показать секцию мессенджера
function showMessengerSection(section) {
    const sections = ['contacts', 'chats', 'calls'];
    sections.forEach(sec => {
        const content = document.getElementById(sec + 'Content');
        const btn = document.getElementById('show' + sec.charAt(0).toUpperCase() + sec.slice(1) + 'Btn');
        
        if (content) content.style.display = sec === section ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', sec === section);
    });
    
    if (section === 'contacts') {
        loadContacts();
    } else if (section === 'chats') {
        loadChats();
    } else if (section === 'calls') {
        loadCallHistory();
    }
}

// Загрузка контактов
async function loadContacts() {
    try {
        showMessengerLoading('contactsContent');
        
        const { data, error } = await supabase
            .from('users')
            .select('telegram_id, first_name, last_name, username, display_name, class, registration_date, display_bio, nickname_color')
            .neq('telegram_id', user.id)
            .order('first_name');
            
        if (error) throw error;
        
        contacts = data || [];
        displayContacts(contacts);
        
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        showMessengerError('contactsContent', 'Не удалось загрузить контакты');
    }
}

// Отображение контактов
function displayContacts(contactsToDisplay) {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    if (!contactsToDisplay || contactsToDisplay.length === 0) {
        container.innerHTML = `
            <div class="messenger-empty">
                <i class='bx bx-user-plus'></i>
                <p>Контакты не найдены</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = contactsToDisplay.map(contact => `
        <div class="contact-item" onclick="openChat(${contact.telegram_id})">
            <div class="contact-avatar">
                <i class='bx bx-user'></i>
            </div>
            <div class="contact-info">
                <h4 style="color: ${contact.nickname_color || '#667eea'}">${getUserDisplayName(contact)}</h4>
                <span>@${contact.username || 'без username'}</span>
                <p class="contact-class">${contact.class} класс</p>
            </div>
            <div class="contact-action">
                <i class='bx bx-message'></i>
            </div>
        </div>
    `).join('');
}

// Открыть чат с пользователем
async function openChat(userId) {
    try {
        // Найти пользователя в контактах или загрузить его профиль
        currentChat = contacts.find(c => c.telegram_id === userId);
        if (!currentChat) {
            currentChat = await getUserProfile(userId);
        }
        
        if (!currentChat) {
            showNotification('Пользователь не найден');
            return;
        }
        
        // Показать чат
        const contactsContent = document.getElementById('contactsContent');
        const chatWindow = document.getElementById('chatWindow');
        if (contactsContent && chatWindow) {
            contactsContent.style.display = 'none';
            chatWindow.style.display = 'block';
        }
        
        // Обновить информацию о чате
        const chatPartnerName = document.getElementById('chatPartnerName');
        const chatPartnerStatus = document.getElementById('chatPartnerStatus');
        if (chatPartnerName && chatPartnerStatus) {
            chatPartnerName.textContent = getUserDisplayName(currentChat);
            chatPartnerName.style.color = currentChat.nickname_color || '#667eea';
            chatPartnerStatus.textContent = 'В сети';
        }
        
        // Загрузить сообщения
        await loadMessages(userId);
        
        // Подписаться на обновления сообщений
        subscribeToMessages(userId);
        
    } catch (error) {
        console.error('Ошибка открытия чата:', error);
        showNotification('Ошибка открытия чата');
    }
}

// Получить профиль пользователя
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('telegram_id, first_name, last_name, username, display_name, class, registration_date, display_bio, nickname_color')
            .eq('telegram_id', userId)
            .maybeSingle();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        return null;
    }
}

// Загрузка сообщений
async function loadMessages(userId) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        messages[userId] = data || [];
        displayMessages(messages[userId]);
        
        // Пометить как прочитанные
        await markMessagesAsRead(userId);
        
    } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
    }
}

// Отображение сообщений
function displayMessages(messagesToDisplay) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    if (!messagesToDisplay || messagesToDisplay.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <p>Начните общение</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messagesToDisplay.map(msg => `
        <div class="message ${msg.sender_id === user.id ? 'my-message' : 'other-message'}">
            <div class="message-content">
                <div class="message-text">${formatMessageText(msg.content)}</div>
                <div class="message-time">${formatTime(msg.created_at)}</div>
            </div>
            <div class="message-status">
                ${msg.sender_id === user.id ? 
                    `<i class='bx ${msg.is_read ? 'bx-check-double' : 'bx-check'}'></i>` : 
                    ''}
            </div>
        </div>
    `).join('');
    
    // Прокрутка вниз
    container.scrollTop = container.scrollHeight;
}

// Отправка сообщения
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const content = input.value.trim();
    if (!content || !currentChat) return;
    
    try {
        const messageData = {
            sender_id: user.id,
            receiver_id: currentChat.telegram_id,
            content: content,
            created_at: new Date().toISOString(),
            is_read: false
        };
        
        const { data, error } = await supabase
            .from('messages')
            .insert([messageData])
            .select();
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            // Добавить сообщение в локальный кеш
            if (!messages[currentChat.telegram_id]) {
                messages[currentChat.telegram_id] = [];
            }
            messages[currentChat.telegram_id].push(data[0]);
            
            // Обновить отображение
            displayMessages(messages[currentChat.telegram_id]);
            
            // Очистить поле ввода
            input.value = '';
            
            // Отправить уведомление о наборе текста
            sendTypingStopped();
            
            // Отправить уведомление получателю
            await sendMessageNotification(currentChat.telegram_id, content);
        }
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        showNotification('Ошибка отправки сообщения');
    }
}

// Отправить уведомление о сообщении
async function sendMessageNotification(receiverId, content) {
    try {
        const notificationData = {
            user_id: receiverId,
            type: 'message',
            title: 'Новое сообщение',
            content: `${getUserDisplayName(currentUserData)}: ${content.substring(0, 100)}`,
            is_read: false,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('notifications')
            .insert([notificationData]);
            
        if (error) console.error('Ошибка отправки уведомления:', error);
        
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
    }
}

// Подписка на сообщения в реальном времени
function subscribeToMessages(userId) {
    // Отписаться от предыдущей подписки
    if (messageSubscriptions[userId]) {
        messageSubscriptions[userId].unsubscribe();
    }
    
    messageSubscriptions[userId] = supabase
        .channel('messages-' + userId)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                handleNewMessage(payload.new);
            }
        )
        .subscribe();
}

// Обработка нового сообщения
function handleNewMessage(message) {
    if ((message.sender_id === currentChat?.telegram_id && message.receiver_id === user.id) ||
        (message.receiver_id === currentChat?.telegram_id && message.sender_id === user.id)) {
        
        // Добавить сообщение в кеш
        if (!messages[currentChat.telegram_id]) {
            messages[currentChat.telegram_id] = [];
        }
        messages[currentChat.telegram_id].push(message);
        
        // Обновить отображение
        displayMessages(messages[currentChat.telegram_id]);
        
        // Пометить как прочитанное
        if (message.sender_id !== user.id) {
            markMessageAsRead(message.id);
        }
        
        // Показать уведомление если чат не активен
        if (!amIActive) {
            showMessageNotification(message);
        }
    }
}

// Показать уведомление о сообщении
function showMessageNotification(message) {
    const notification = {
        id: Date.now(),
        type: 'message',
        title: 'Новое сообщение',
        content: `От: ${getUserDisplayName(currentChat)}`,
        created_at: new Date().toISOString(),
        is_read: false
    };
    
    addNotificationToPanel(notification);
    updateNotificationBadge();
}

// Отметить сообщения как прочитанные
async function markMessagesAsRead(userId) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', userId)
            .eq('is_read', false);
            
        if (error) console.error('Ошибка отметки сообщений:', error);
        
    } catch (error) {
        console.error('Ошибка отметки сообщений:', error);
    }
}

// Отметить одно сообщение как прочитанное
async function markMessageAsRead(messageId) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId);
            
        if (error) console.error('Ошибка отметки сообщения:', error);
        
    } catch (error) {
        console.error('Ошибка отметки сообщения:', error);
    }
}

// Поиск пользователей
async function searchUsers() {
    const searchInput = document.getElementById('searchUserInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        loadContacts();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('users')
            .select('telegram_id, first_name, last_name, username, display_name, class, registration_date, nickname_color')
            .or(`username.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
            .neq('telegram_id', user.id);
            
        if (error) throw error;
        
        displayContacts(data || []);
        
    } catch (error) {
        console.error('Ошибка поиска пользователей:', error);
    }
}

// Загрузка чатов
async function loadChats() {
    try {
        showMessengerLoading('chatsContent');
        
        // Получаем пользователей, с которыми есть сообщения
        const { data, error } = await supabase
            .from('messages')
            .select('sender_id, receiver_id, created_at')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Получаем уникальных пользователей
        const uniqueUserIds = [...new Set(data.flatMap(msg => 
            [msg.sender_id, msg.receiver_id].filter(id => id !== user.id)
        ))];
        
        // Загружаем информацию о пользователях
        const usersData = await Promise.all(
            uniqueUserIds.map(id => getUserProfile(id))
        );
        
        displayContacts(usersData.filter(user => user !== null));
        
    } catch (error) {
        console.error('Ошибка загрузки чатов:', error);
        showMessengerError('chatsContent', 'Не удалось загрузить чаты');
    }
}

// Загрузка истории звонков
async function loadCallHistory() {
    try {
        showMessengerLoading('callsContent');
        
        const { data, error } = await supabase
            .from('calls')
            .select(`
                *,
                caller:users!calls_caller_id_fkey(telegram_id, first_name, last_name, username, display_name, nickname_color),
                receiver:users!calls_receiver_id_fkey(telegram_id, first_name, last_name, username, display_name, nickname_color)
            `)
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        displayCallHistory(data || []);
        
    } catch (error) {
        console.error('Ошибка загрузки истории звонков:', error);
        showMessengerError('callsContent', 'Не удалось загрузить историю звонков');
    }
}

// Отображение истории звонков
function displayCallHistory(calls) {
    const container = document.getElementById('callsList');
    if (!container) return;
    
    if (!calls || calls.length === 0) {
        container.innerHTML = `
            <div class="messenger-empty">
                <i class='bx bx-phone-call'></i>
                <p>История звонков пуста</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = calls.map(call => {
        const isOutgoing = call.caller_id === user.id;
        const partner = isOutgoing ? call.receiver : call.caller;
        const callTypeIcon = call.call_type === 'video' ? 'bx-video' : 'bx-phone';
        const callStatus = getCallStatus(call, isOutgoing);
        
        return `
            <div class="call-item" onclick="redial(${partner.telegram_id}, '${call.call_type}')">
                <div class="call-avatar">
                    <i class='bx ${callTypeIcon}'></i>
                </div>
                <div class="call-info">
                    <h4 style="color: ${partner.nickname_color || '#667eea'}">${getUserDisplayName(partner)}</h4>
                    <span class="call-type">${call.call_type === 'video' ? 'Видеозвонок' : 'Голосовой звонок'}</span>
                    <span class="call-time">${formatDate(call.created_at)}</span>
                </div>
                <div class="call-status ${callStatus.replace(' ', '-')}">
                    <i class='bx ${getCallStatusIcon(callStatus)}'></i>
                </div>
            </div>
        `;
    }).join('');
}

// Переход по звонку
function redial(userId, callType) {
    openChat(userId);
    setTimeout(() => startCall(callType), 500);
}

// ==============================
// СИСТЕМА ЗВОНКОВ
// ==============================

// Начать звонок
async function startCall(type = 'audio') {
    if (!currentChat) {
        showNotification('Выберите собеседника для звонка');
        return;
    }
    
    try {
        const callData = {
            caller_id: user.id,
            receiver_id: currentChat.telegram_id,
            call_type: type,
            status: 'calling',
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('calls')
            .insert([callData])
            .select();
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            currentCall = { id: data[0].id, partner: currentChat, type: type };
            
            // Показать окно звонка
            showCallModal('outgoing', currentChat, data[0].id);
            
            // Отправить уведомление о звонке
            await sendCallNotification(currentChat.telegram_id, data[0].id, type);
            
            // Имитация звонка (в реальном приложении здесь был бы WebRTC)
            simulateCallRing();
        }
        
    } catch (error) {
        console.error('Ошибка начала звонка:', error);
        showNotification('Ошибка начала звонка');
    }
}

// Имитация звонка
function simulateCallRing() {
    setTimeout(() => {
        if (currentCall) {
            showNotification('Звонок имитируется (в реальном приложении использовался бы WebRTC)');
        }
    }, 2000);
}

// Принять звонок
async function acceptCall() {
    if (!currentCall) return;
    
    try {
        await updateCallStatus('in_progress');
        
        // Показать окно активного звонка
        const incomingCallModal = document.getElementById('incomingCallModal');
        if (incomingCallModal) incomingCallModal.style.display = 'none';
        showCallModal('active', currentCall.partner, currentCall.id);
        
        showNotification('Звонок принят');
        
    } catch (error) {
        console.error('Ошибка принятия звонка:', error);
        showNotification('Ошибка принятия звонка');
    }
}

// Отклонить звонок
async function declineCall() {
    if (!currentCall) return;
    
    try {
        await updateCallStatus('declined');
        closeIncomingCallModal();
        showNotification('Звонок отклонен');
        
    } catch (error) {
        console.error('Ошибка отклонения звонка:', error);
        showNotification('Ошибка отклонения звонка');
    }
}

// Завершить звонок
async function endCall() {
    if (!currentCall) return;
    
    try {
        await updateCallStatus('ended');
        closeCallModal();
        showNotification('Звонок завершен');
        
    } catch (error) {
        console.error('Ошибка завершения звонка:', error);
        showNotification('Ошибка завершения звонка');
    }
}

// Обновить статус звонка
async function updateCallStatus(status) {
    if (!currentCall) return;
    
    try {
        const { error } = await supabase
            .from('calls')
            .update({ 
                status: status,
                ended_at: status === 'ended' || status === 'declined' ? new Date().toISOString() : null
            })
            .eq('id', currentCall.id);
            
        if (error) throw error;
        
    } catch (error) {
        console.error('Ошибка обновления статуса звонка:', error);
    }
}

// Показать модальное окно звонка
function showCallModal(type, partner, callId) {
    const modal = document.getElementById('callModal');
    const statusElement = document.getElementById('callStatus');
    const partnerElement = document.getElementById('callPartnerName');
    const typeElement = document.getElementById('callType');
    
    if (!modal || !statusElement || !partnerElement || !typeElement) return;
    
    if (type === 'outgoing') {
        statusElement.textContent = 'Вызов...';
    } else if (type === 'active') {
        statusElement.textContent = 'Разговор';
    }
    
    partnerElement.textContent = getUserDisplayName(partner);
    partnerElement.style.color = partner.nickname_color || '#667eea';
    typeElement.textContent = currentCall.type === 'video' ? 'Видеозвонок' : 'Голосовой звонок';
    
    modal.style.display = 'flex';
}

// Показать входящий звонок
function showIncomingCall(caller, callId, callType) {
    currentCall = { id: callId, partner: caller, type: callType };
    
    const incomingCallName = document.getElementById('incomingCallName');
    const incomingCallType = document.getElementById('incomingCallType');
    const incomingCallModal = document.getElementById('incomingCallModal');
    
    if (!incomingCallName || !incomingCallType || !incomingCallModal) return;
    
    incomingCallName.textContent = getUserDisplayName(caller);
    incomingCallName.style.color = caller.nickname_color || '#667eea';
    incomingCallType.textContent = callType === 'video' ? 'Видеозвонок' : 'Голосовой звонок';
    incomingCallModal.style.display = 'flex';
}

// Закрыть модальное окно звонка
function closeCallModal() {
    const modal = document.getElementById('callModal');
    if (modal) modal.style.display = 'none';
    currentCall = null;
}

// Закрыть модальное окно входящего звонка
function closeIncomingCallModal() {
    const modal = document.getElementById('incomingCallModal');
    if (modal) modal.style.display = 'none';
    currentCall = null;
}

// Отправить уведомление о звонке
async function sendCallNotification(receiverId, callId, callType) {
    try {
        const notificationData = {
            user_id: receiverId,
            type: 'call',
            title: 'Входящий звонок',
            content: `${getUserDisplayName(currentUserData)} вызывает вас на ${callType === 'video' ? 'видеозвонок' : 'голосовой звонок'}`,
            is_read: false,
            related_id: callId,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('notifications')
            .insert([notificationData]);
            
        if (error) console.error('Ошибка отправки уведомления о звонке:', error);
        
    } catch (error) {
        console.error('Ошибка отправки уведомления о звонке:', error);
    }
}

// ==============================
// СИСТЕМА УВЕДОМЛЕНИЙ
// ==============================

// Загрузка уведомлений
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        notifications = data || [];
        displayNotifications(notifications);
        updateNotificationBadge();
        
        // Подписка на новые уведомления
        setupNotificationSubscription();
        
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
    }
}

// Настройка подписки на уведомления
function setupNotificationSubscription() {
    if (notificationSubscription) {
        notificationSubscription.unsubscribe();
    }
    
    notificationSubscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
                handleNewNotification(payload.new);
            }
        )
        .subscribe();
}

// Обработка нового уведомления
function handleNewNotification(notification) {
    notifications.unshift(notification);
    displayNotifications(notifications);
    updateNotificationBadge();
    
    // Показать всплывающее уведомление
    if (notification.type === 'message') {
        showNotification(`Новое сообщение: ${notification.content}`);
    } else if (notification.type === 'call') {
        // Для звонков показываем специальное окно
        const caller = contacts.find(c => c.telegram_id === notification.related_id);
        if (caller) {
            showIncomingCall(caller, notification.related_id, 'audio');
        }
    } else {
        showNotification(`${notification.title}: ${notification.content}`);
    }
}

// Отображение уведомлений
function displayNotifications(notificationsToDisplay) {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notificationsToDisplay || notificationsToDisplay.length === 0) {
        container.innerHTML = `
            <div class="notification-item">
                <i class='bx bx-check-circle'></i>
                <div class="notification-content">
                    <p>Уведомлений нет</p>
                    <span>Все уведомления прочитаны</span>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notificationsToDisplay.map(notification => `
        <div class="notification-item ${notification.is_read ? '' : 'new'}" 
             onclick="markNotificationAsRead(${notification.id})">
            <i class='bx ${getNotificationIcon(notification.type)}'></i>
            <div class="notification-content">
                <p>${notification.title}</p>
                <span>${formatDate(notification.created_at)}</span>
                ${notification.content ? `<div class="notification-details">${notification.content}</div>` : ''}
            </div>
            ${!notification.is_read ? '<div class="notification-dot"></div>' : ''}
        </div>
    `).join('');
}

// Отметить уведомление как прочитанное
async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
            
        if (error) throw error;
        
        // Обновить локальные данные
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
        }
        
        // Обновить отображение
        displayNotifications(notifications);
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
    }
}

// Добавить уведомление в панель
function addNotificationToPanel(notification) {
    notifications.unshift(notification);
    displayNotifications(notifications);
    updateNotificationBadge();
}

// Обновить бейдж уведомлений
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (!badge) return;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ==============================
// СИСТЕМА ЗАМЕТОК
// ==============================

// Загрузка заметок
async function loadNotes() {
    if (!user) return;
    
    try {
        showNotesLoading();
        
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('telegram_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });
            
        if (error) {
            console.error('Ошибка загрузки заметок:', error);
            showNotesError('Не удалось загрузить заметки');
            return;
        }
        
        notes = data || [];
        displayNotes(notes);
        
    } catch (error) {
        console.error('Ошибка при загрузке заметок:', error);
        showNotesError('Ошибка при загрузке заметок');
    }
}

// Отображение заметок
function displayNotes(notesToDisplay) {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    if (!notesToDisplay || notesToDisplay.length === 0) {
        container.innerHTML = `
            <div class="notes-empty">
                <i class='bx bx-note'></i>
                <h3>Пока нет заметок</h3>
                <p>Нажмите кнопку "Новая заметка" выше чтобы создать первую</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notesToDisplay.map(note => `
        <div class="note-card ${note.is_pinned ? 'pinned' : ''}" 
             onclick="editNote(${note.id})"
             style="border-left-color: ${note.color || '#667eea'}">
            <div class="note-header">
                <div>
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    <div class="note-category">${getCategoryName(note.category)}</div>
                </div>
            </div>
            <div class="note-content">${escapeHtml(note.content || '')}</div>
            <div class="note-footer">
                <span>${formatDate(note.updated_at)}</span>
                <div class="note-actions">
                    <button class="note-action-btn" onclick="event.stopPropagation(); togglePinNote(${note.id})" 
                            title="${note.is_pinned ? 'Открепить' : 'Закрепить'}">
                        <i class='bx ${note.is_pinned ? 'bxs-pin' : 'bx-pin'}'></i>
                    </button>
                    <button class="note-action-btn" onclick="event.stopPropagation(); deleteNote(${note.id})" title="Удалить">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Показать загрузку заметок
function showNotesLoading() {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="notes-loading">
            <i class='bx bx-loader-circle bx-spin'></i>
            <p>Загружаем ваши заметки...</p>
        </div>
    `;
}

// Показать ошибку загрузки заметок
function showNotesError(message) {
    const container = document.getElementById('notesContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="notes-empty">
            <i class='bx bx-error-circle'></i>
            <h3>Ошибка загрузки</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="loadNotes()" style="margin-top: 1rem;">
                <i class='bx bx-refresh'></i>
                Попробовать снова
            </button>
        </div>
    `;
}

// Показать модальное окно заметки
function showNoteModal(noteId = null) {
    const modal = document.getElementById('noteModal');
    const titleInput = document.getElementById('noteModalTitle');
    const saveBtn = document.getElementById('saveNoteBtn');
    const deleteBtn = document.getElementById('deleteNoteBtn');
    
    if (!modal || !titleInput || !saveBtn || !deleteBtn) return;
    
    currentEditingNote = noteId ? notes.find(n => n.id === noteId) : null;
    
    if (currentEditingNote) {
        // Режим редактирования
        titleInput.textContent = 'Редактировать заметку';
        document.getElementById('noteTitle').value = currentEditingNote.title;
        document.getElementById('noteContent').value = currentEditingNote.content || '';
        document.getElementById('noteCategory').value = currentEditingNote.category;
        document.getElementById('notePinned').checked = currentEditingNote.is_pinned;
        selectColor(currentEditingNote.color || '#667eea');
        deleteBtn.style.display = 'block';
    } else {
        // Режим создания
        titleInput.textContent = 'Новая заметка';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('noteCategory').value = 'general';
        document.getElementById('notePinned').checked = false;
        selectColor('#667eea');
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('show');
}

// Закрыть модальное окно заметки
function closeNoteModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
        modal.classList.remove('show');
        currentEditingNote = null;
    }
}

// Выбор цвета заметки
function selectColor(color) {
    noteColor = color;
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === color) {
            option.classList.add('selected');
        }
    });
    const noteColorInput = document.getElementById('noteColor');
    if (noteColorInput) noteColorInput.value = color;
}

// Сохранение заметки
async function saveNote() {
    if (!user) {
        showNotification('Ошибка: пользователь не авторизован');
        return;
    }
    
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    
    if (!titleInput || !contentInput) return;
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = document.getElementById('noteCategory')?.value || 'general';
    const isPinned = document.getElementById('notePinned')?.checked || false;
    
    if (!title) {
        showNotification('Пожалуйста, введите заголовок заметки');
        return;
    }
    
    const saveBtn = document.getElementById('saveNoteBtn');
    if (!saveBtn) return;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Сохранение...';
    
    try {
        const noteData = {
            telegram_id: user.id,
            title: title,
            content: content,
            category: category,
            is_pinned: isPinned,
            color: noteColor,
            updated_at: new Date().toISOString()
        };
        
        let result;
        
        if (currentEditingNote) {
            // Обновление существующей заметки
            const { data, error } = await supabase
                .from('notes')
                .update(noteData)
                .eq('id', currentEditingNote.id)
                .select();
                
            if (error) {
                console.error('Ошибка обновления заметки:', error);
                throw new Error(`Не удалось обновить заметку: ${error.message}`);
            }

            if (data && data.length > 0) {
                result = data[0];
            }
            
        } else {
            // Создание новой заметки
            const { data, error } = await supabase
                .from('notes')
                .insert([noteData])
                .select();
                
            if (error) {
                console.error('Ошибка создания заметки:', error);
                
                // Если ошибка RLS, попробуем временное решение
                if (error.message.includes('row-level security')) {
                    showNotification('Проблема с настройками безопасности. Попробуйте обновить страницу.');
                    return;
                }
                
                throw new Error(`Не удалось создать заметку: ${error.message}`);
            }

            if (data && data.length > 0) {
                result = data[0];
            }
        }
        
        showNotification(currentEditingNote ? 'Заметка обновлена!' : 'Заметка создана!');
        closeNoteModal();
        await loadNotes(); // Перезагружаем список заметок
        
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        showNotification(error.message || 'Ошибка при сохранении заметки');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить заметку';
    }
}

// Удаление заметки
async function deleteNote(noteId = null) {
    const idToDelete = noteId || currentEditingNote?.id;
    if (!idToDelete) return;
    
    if (!confirm('Вы уверены, что хотите удалить эту заметку?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', idToDelete);
            
        if (error) throw error;
        
        showNotification('Заметка удалена');
        
        if (noteId) {
            // Удаление из списка
            await loadNotes();
        } else {
            // Удаление из модального окна
            closeNoteModal();
            await loadNotes();
        }
        
    } catch (error) {
        console.error('Ошибка удаления заметки:', error);
        showNotification('Ошибка при удалении заметки');
    }
}

// Закрепление/открепление заметки
async function togglePinNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    try {
        const { error } = await supabase
            .from('notes')
            .update({
                is_pinned: !note.is_pinned,
                updated_at: new Date().toISOString()
            })
            .eq('id', noteId);
            
        if (error) throw error;
        
        await loadNotes(); // Перезагружаем список
        
    } catch (error) {
        console.error('Ошибка закрепления заметки:', error);
        showNotification('Ошибка при изменении заметки');
    }
}

// Редактирование заметки
function editNote(noteId) {
    showNoteModal(noteId);
}

// Поиск заметок
function searchNotes() {
    const searchTerm = document.getElementById('notesSearch')?.value.toLowerCase() || '';
    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        (note.content && note.content.toLowerCase().includes(searchTerm))
    );
    displayNotes(filteredNotes);
}

// Фильтрация заметок
function filterNotes() {
    const category = document.getElementById('notesCategoryFilter')?.value || 'all';
    const searchTerm = document.getElementById('notesSearch')?.value.toLowerCase() || '';
    
    let filteredNotes = notes;
    
    if (category !== 'all') {
        filteredNotes = filteredNotes.filter(note => note.category === category);
    }
    
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            (note.content && note.content.toLowerCase().includes(searchTerm))
        );
    }
    
    displayNotes(filteredNotes);
}

// ==============================
// СИСТЕМА ПРОФИЛЯ
// ==============================

// Загрузка данных профиля
function loadProfileData() {
    if (!currentUserData) {
        console.log('❌ Нет данных пользователя для загрузки профиля');
        return;
    }
    
    console.log('📊 Загружаем данные профиля:', currentUserData);
    
    // Основная информация
    const profileTelegramId = document.getElementById('profileTelegramId');
    const profileFirstName = document.getElementById('profileFirstName');
    const profileLastName = document.getElementById('profileLastName');
    const profileClass = document.getElementById('profileClass');
    const profileUsername = document.getElementById('profileUsername');
    const profileRegDate = document.getElementById('profileRegDate');
    
    if (profileTelegramId) profileTelegramId.textContent = currentUserData.telegram_id || '-';
    if (profileFirstName) profileFirstName.textContent = currentUserData.first_name || 'Не указано';
    if (profileLastName) profileLastName.textContent = currentUserData.last_name || 'Не указано';
    if (profileClass) profileClass.textContent = currentUserData.class || 'Не указан';
    if (profileUsername) profileUsername.textContent = currentUserData.username ? `@${currentUserData.username}` : 'Не указан';
    
    // Форматируем дату регистрации
    if (profileRegDate) {
        if (currentUserData.registration_date) {
            const regDate = new Date(currentUserData.registration_date);
            profileRegDate.textContent = regDate.toLocaleDateString('ru-RU');
        } else {
            profileRegDate.textContent = 'Не указана';
        }
    }
    
    // Загружаем настройки профиля
    loadProfileSettings();
}

function loadProfileSettings() {
    const displayName = document.getElementById('displayName');
    const displayBio = document.getElementById('displayBio');
    
    if (displayName) displayName.value = currentUserData.display_name || '';
    if (displayBio) displayBio.value = currentUserData.display_bio || '';
    
    // Цвет ника
    const savedColor = currentUserData.nickname_color || '#667eea';
    selectNicknameColor(savedColor);
}

async function saveProfileSettings() {
    if (!user || !currentUserData) {
        showNotification('Ошибка: пользователь не авторизован');
        return;
    }
    
    const displayName = document.getElementById('displayName')?.value.trim() || '';
    const displayBio = document.getElementById('displayBio')?.value.trim() || '';
    
    console.log('💾 Сохраняем настройки:', { 
        telegram_id: user.id,
        displayName, 
        displayBio, 
        nicknameColor 
    });
    
    try {
        const updateData = {
            display_name: displayName || null,
            display_bio: displayBio || null,
            nickname_color: nicknameColor,
            updated_at: new Date().toISOString()
        };
        
        console.log('📤 Отправляем данные в Supabase:', updateData);
        
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('telegram_id', user.id)
            .select();
            
        if (error) {
            console.error('❌ Ошибка сохранения настроек:', error);
            showNotification('❌ Ошибка при сохранении настроек: ' + error.message);
            return;
        }
        
        // Вручную берем первый элемент из массива
        if (data && data.length > 0) {
            console.log('✅ Настройки сохранены:', data[0]);
            currentUserData = data[0];
            showNotification('✅ Настройки профиля сохранены!');
        } else {
            console.log('⚠️ Данные не возвращены, но ошибки нет');
            showNotification('✅ Настройки профиля сохранены!');
            // Обновляем данные вручную
            await refreshProfile();
        }
        
    } catch (error) {
        console.error('❌ Ошибка при сохранении настроек:', error);
        showNotification('❌ Ошибка при сохранении настроек: ' + error.message);
    }
}

async function setAccountPassword() {
    const password = document.getElementById('accountPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    
    if (!password) {
        showNotification('Введите пароль');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают');
        return;
    }
    
    if (password.length < 4) {
        showNotification('Пароль должен содержать минимум 4 символа');
        return;
    }
    
    try {
        console.log('🔐 Устанавливаем пароль для пользователя:', user.id);
        
        const { data, error } = await supabase
            .from('users')
            .update({
                account_password: password,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_id', user.id)
            .select();
            
        if (error) {
            console.error('❌ Ошибка установки пароля:', error);
            showNotification('❌ Ошибка при установке пароля: ' + error.message);
            return;
        }
        
        // Вручную берем первый элемент из массива
        if (data && data.length > 0) {
            console.log('✅ Пароль установлен:', data[0]);
            currentUserData = data[0];
        } else {
            console.log('⚠️ Данные не возвращены, но ошибки нет');
            // Обновляем данные вручную
            await refreshProfile();
        }
        
        // Очищаем поля
        const accountPassword = document.getElementById('accountPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (accountPassword) accountPassword.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        
        showNotification('✅ Пароль успешно установлен!');
        
    } catch (error) {
        console.error('❌ Ошибка при установке пароля:', error);
        showNotification('❌ Ошибка при установке пароля: ' + error.message);
    }
}

// Функция показа модального окна пароля
async function showPasswordLogin(userData) {
    pendingLoginUser = userData;
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.classList.add('show');
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) loginPassword.focus();
        }, 100);
    }
}

// Функция проверки пароля
async function verifyPassword() {
    const password = document.getElementById('loginPassword')?.value || '';
    
    if (!password) {
        showNotification('Введите пароль');
        return;
    }
    
    if (!pendingLoginUser) {
        showNotification('Ошибка: данные пользователя не найдены');
        return;
    }
    
    console.log('🔐 Проверяем пароль...');
    
    // Проверяем пароль
    if (pendingLoginUser.account_password === password) {
        console.log('✅ Пароль верный');
        await completeLogin(pendingLoginUser);
        closePasswordModal();
    } else {
        console.log('❌ Неверный пароль');
        showNotification('Неверный пароль');
        const loginPassword = document.getElementById('loginPassword');
        if (loginPassword) {
            loginPassword.value = '';
            loginPassword.focus();
        }
    }
}

// Функция завершения входа
async function completeLogin(userData) {
    try {
        console.log('🚀 Завершаем вход пользователя:', userData.telegram_id);
        
        // Обновляем статус входа
        const { error } = await supabase
            .from('users')
            .update({
                is_logged_in: true,
                last_login: new Date().toISOString()
            })
            .eq('telegram_id', userData.telegram_id);
            
        if (error) {
            console.error('❌ Ошибка обновления статуса входа:', error);
        }
        
        currentUserData = userData;
        showMainApp();
        
    } catch (error) {
        console.error('❌ Ошибка при завершении входа:', error);
        showMainApp(); // Все равно показываем приложение
    }
}

// Закрытие модального окна пароля
function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        modal.classList.remove('show');
        const loginPassword = document.getElementById('loginPassword');
        if (loginPassword) loginPassword.value = '';
        pendingLoginUser = null;
    }
}

function cancelLogin() {
    closePasswordModal();
    showNotification('Вход отменен');
    
    // После отмены входа показываем экран регистрации снова
    // но сохраняем уже выбранный класс если он был
    showRegistrationScreen();
    
    // Восстанавливаем выбранный класс если он был
    if (selectedClass) {
        updateClassButtons();
        updateRegistrationButton();
    }
}

// Функция выхода
async function logout() {
    if (!confirm('Вы уверены, что хотите выйти?')) {
        return;
    }
    
    try {
        console.log('🚪 Выход из аккаунта...');
        
        // Обновляем статус в базе данных
        if (user && currentUserData) {
            const { error } = await supabase
                .from('users')
                .update({
                    is_logged_in: false,
                    last_login: new Date().toISOString()
                })
                .eq('telegram_id', user.id);
                
            if (error) {
                console.error('❌ Ошибка обновления статуса выхода:', error);
            }
        }
        
        // Полностью очищаем данные
        user = null;
        currentUserData = null;
        selectedClass = null;
        notes = [];
        
        console.log('✅ Данные очищены, перезагружаем страницу...');
        
        // Показываем сообщение
        showNotification('Выход выполнен успешно');
        
        // Ждем немного и перезагружаем страницу
        setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
        }, 1500);
        
    } catch (error) {
        console.error('❌ Ошибка при выходе:', error);
        // В случае ошибки все равно делаем перезагрузку
        window.location.reload();
    }
}

// Дополнительные функции профиля
async function refreshProfile() {
    if (!user) return;
    
    try {
        console.log('🔄 Обновляем данные профиля...');
        const userData = await getUserData(user.id);
        if (userData) {
            currentUserData = userData;
            loadProfileData();
            showNotification('✅ Данные профиля обновлены!');
        }
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        showNotification('❌ Ошибка при обновлении данных');
    }
}

function exportData() {
    if (!currentUserData) return;
    
    // Создаем данные для экспорта
    const exportData = {
        profile: currentUserData,
        notes: notes,
        export_date: new Date().toISOString(),
        export_from: 'Derzava CDZ'
    };
    
    // Создаем и скачиваем файл
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `derzava_export_${user.id}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('✅ Данные экспортированы!');
}

// ==============================
// ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ==============================

// Переключение между секциями
function showSection(sectionName) {
    // Скрываем все секции
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    const activeSection = document.getElementById(`${sectionName}-content`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // Загружаем данные для определенных разделов
    if (sectionName === 'notes') {
        loadNotes();
    } else if (sectionName === 'profile') {
        loadProfileData();
    } else if (sectionName === 'messenger') {
        // При открытии мессенджера загружаем контакты
        loadContacts();
    }
    
    // Закрываем уведомления при переключении секций
    closeNotifications();
}

// Управление уведомлениями
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.toggle('show');
        
        // При открытии панели обновляем уведомления
        if (panel.classList.contains('show')) {
            loadNotifications();
        }
    }
}

function closeNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.remove('show');
    }
}

// Создание новой заметки
function createNewNote() {
    showNoteModal();
}

// Сброс состояния регистрации
function resetRegistrationState() {
    selectedClass = null;
    const classButtons = document.querySelectorAll('.class-btn');
    classButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    updateRegistrationButton();
}

// ==============================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================

// Получить отображаемое имя пользователя
function getUserDisplayName(userData) {
    return userData.display_name || 
           (userData.first_name && userData.last_name ? 
            `${userData.first_name} ${userData.last_name}` : 
            userData.first_name || 
            userData.username || 
            'Пользователь');
}

// Форматирование времени
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Сегодня';
    } else if (diffDays === 1) {
        return 'Вчера';
    } else if (diffDays < 7) {
        return `${diffDays} дней назад`;
    } else {
        return date.toLocaleDateString('ru-RU');
    }
}

// Декоратор для ограничения частоты вызовов
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Обработка ввода текста (для индикации набора)
function handleTyping() {
    if (!currentChat) return;
    
    clearTimeout(typingTimer);
    sendTypingStarted();
    
    typingTimer = setTimeout(() => {
        sendTypingStopped();
    }, 1000);
}

// Отправить статус "печатает"
function sendTypingStarted() {
    console.log('Пользователь печатает...');
}

// Отправить статус "перестал печатать"
function sendTypingStopped() {
    console.log('Пользователь перестал печатать');
}

// Форматирование текста сообщения (поддержка эмодзи)
function formatMessageText(text) {
    const emojiMap = {
        ':)': '😊',
        ':(': '😔',
        ':D': '😃',
        ':p': '😋',
        ';-)': '😉',
        '<3': '❤️'
    };
    
    let formattedText = text;
    Object.keys(emojiMap).forEach(key => {
        formattedText = formattedText.split(key).join(emojiMap[key]);
    });
    
    return formattedText.replace(/\n/g, '<br>');
}

// Получить иконку для типа уведомления
function getNotificationIcon(type) {
    const icons = {
        'message': 'bx-message',
        'call': 'bx-phone-call',
        'system': 'bx-info-circle',
        'warning': 'bx-error',
        'success': 'bx-check-circle'
    };
    return icons[type] || 'bx-bell';
}

// Получить статус звонка
function getCallStatus(call, isOutgoing) {
    if (call.status === 'completed') return 'completed';
    if (call.status === 'missed') return isOutgoing ? 'missed' : 'missed';
    if (call.status === 'declined') return 'declined';
    return 'completed';
}

// Получить иконку статуса звонка
function getCallStatusIcon(status) {
    const icons = {
        'completed': 'bx-check-circle',
        'missed': 'bx-x-circle',
        'declined': 'bx-x-circle',
        'in_progress': 'bx-phone-call'
    };
    return icons[status] || 'bx-phone';
}

// Показать загрузку в мессенджере
function showMessengerLoading(section) {
    const container = document.getElementById(section);
    if (!container) return;
    
    const list = container.querySelector('.messenger-list');
    if (list) {
        list.innerHTML = `
            <div class="messenger-loading">
                <i class='bx bx-loader-circle bx-spin'></i>
                <p>Загрузка...</p>
            </div>
        `;
    }
}

// Показать ошибку в мессенджере
function showMessengerError(section, message) {
    const container = document.getElementById(section);
    if (!container) return;
    
    const list = container.querySelector('.messenger-list');
    if (list) {
        list.innerHTML = `
            <div class="messenger-error">
                <i class='bx bx-error-circle'></i>
                <p>${message}</p>
                <button onclick="location.reload()">Попробовать снова</button>
            </div>
        `;
    }
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Получение названия категории
function getCategoryName(category) {
    const categories = {
        'general': 'Общие',
        'school': 'Школа',
        'homework': 'Домашние задания',
        'personal': 'Личные',
        'ideas': 'Идеы'
    };
    return categories[category] || category;
}

// Показать уведомление
function showNotification(message) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Симуляция пользователя для тестирования
function simulateTelegramUser() {
    user = {
        id: Math.floor(Math.random() * 1000000000),
        first_name: 'Иван',
        last_name: 'Тестовый',
        username: 'test_user',
        photo_url: ''
    };
    
    console.log('⚠️ Режим тестирования (вне Telegram)');
    displayRegistrationInfo();
    showRegistrationScreen();
}

// ==============================
// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ==============================

window.selectClass = selectClass;
window.completeRegistration = completeRegistration;
window.showSection = showSection;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.logout = logout;
window.createNewNote = createNewNote;
window.resetRegistrationState = resetRegistrationState;

// Функции заметок
window.showNoteModal = showNoteModal;
window.closeNoteModal = closeNoteModal;
window.selectColor = selectColor;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.togglePinNote = togglePinNote;
window.editNote = editNote;
window.searchNotes = searchNotes;
window.filterNotes = filterNotes;

// Функции мессенджера
window.openChat = openChat;
window.sendMessage = sendMessage;
window.startCall = startCall;
window.acceptCall = acceptCall;
window.declineCall = declineCall;
window.endCall = endCall;
window.markNotificationAsRead = markNotificationAsRead;
window.insertEmoji = insertEmoji;
window.toggleEmojiPicker = toggleEmojiPicker;
window.showMessengerSection = showMessengerSection;
window.redial = redial;

// Функции профиля
window.selectNicknameColor = selectNicknameColor;
window.saveProfileSettings = saveProfileSettings;
window.setAccountPassword = setAccountPassword;
window.refreshProfile = refreshProfile;
window.exportData = exportData;
window.verifyPassword = verifyPassword;
window.cancelLogin = cancelLogin;

// Утилиты для отладки
window.getCurrentUser = () => currentUserData;
window.getTelegramUser = () => user;
window.getNotes = () => notes;
window.debugSupabase = () => {
    console.log('🔧 Отладка Supabase:');
    console.log('User:', user);
    console.log('Current User Data:', currentUserData);
    console.log('Supabase client:', supabase);
};

// Добавляем CSS для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

console.log('✅ Derzava CDZ инициализирован: Мессенджер, Уведомления, Заметки и Профиль готовы к работе!');
