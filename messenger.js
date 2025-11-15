// messenger.js - Система мессенджера

class MessengerSystem {
    constructor() {
        this.chats = [];
        this.activeChat = null;
        this.messages = [];
        this.users = new Map();
        this.isInitialized = false;
        this.typingUsers = new Set();
        this.typingTimeout = null;
    }

    // Инициализация мессенджера
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.loadChats();
            await this.loadUsers();
            this.setupRealTime();
            this.isInitialized = true;
            console.log('✅ Мессенджер инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации мессенджера:', error);
        }
    }

    // Загрузка чатов пользователя
    async loadChats() {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('chat_participants')
                .select(`
                    chat:chats(*),
                    last_message:messages!last_message_for_chat(*)
                `)
                .eq('telegram_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.chats = data.map(item => ({
                ...item.chat,
                last_message: item.last_message
            }));

            this.renderChatList();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки чатов:', error);
        }
    }

    // Загрузка пользователей
    async loadUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('telegram_id, first_name, last_name, username, display_name, display_bio, nickname_color, registration_date')
                .eq('is_active', true);

            if (error) throw error;

            // Сохраняем пользователей в Map для быстрого доступа
            this.users.clear();
            data.forEach(user => {
                this.users.set(user.telegram_id, user);
            });

        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
        }
    }

    // Поиск пользователя
    async searchUsers(query) {
        if (!query.trim()) return [];

        try {
            const { data, error } = await supabase
                .from('users')
                .select('telegram_id, first_name, last_name, username, display_name, display_bio, nickname_color, registration_date')
                .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
                .eq('is_active', true)
                .limit(10);

            if (error) throw error;

            return data || [];
            
        } catch (error) {
            console.error('❌ Ошибка поиска пользователей:', error);
            return [];
        }
    }

    // Создание или получение чата
    async getOrCreateChat(participantId) {
        if (!user) return null;

        try {
            // Ищем существующий чат
            const { data: existingChats, error: findError } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .in('telegram_id', [user.id, participantId])
                .group('chat_id')
                .having('count(*)', 'eq', 2);

            if (findError) throw findError;

            let chatId;

            if (existingChats && existingChats.length > 0) {
                chatId = existingChats[0].chat_id;
            } else {
                // Создаем новый чат
                const { data: newChat, error: createError } = await supabase
                    .from('chats')
                    .insert([{}])
                    .select()
                    .single();

                if (createError) throw createError;

                chatId = newChat.id;

                // Добавляем участников
                const { error: participantsError } = await supabase
                    .from('chat_participants')
                    .insert([
                        { chat_id: chatId, telegram_id: user.id },
                        { chat_id: chatId, telegram_id: participantId }
                    ]);

                if (participantsError) throw participantsError;
            }

            return chatId;
            
        } catch (error) {
            console.error('❌ Ошибка создания/получения чата:', error);
            return null;
        }
    }

    // Открытие чата
    async openChat(participantId) {
        const chatId = await this.getOrCreateChat(participantId);
        if (!chatId) return;

        this.activeChat = {
            id: chatId,
            participantId: participantId
        };

        await this.loadMessages(chatId);
        this.renderChat();
        this.renderChatList(); // Обновляем список чатов

        // Показываем раздел мессенджера
        showSection('messenger');
    }

    // Загрузка сообщений
    async loadMessages(chatId) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            this.messages = data || [];
            this.renderMessages();

            // Отмечаем сообщения как прочитанные
            await this.markMessagesAsRead(chatId);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений:', error);
        }
    }

    // Отправка сообщения
    async sendMessage(text, emojiData = null) {
        if (!this.activeChat || !text.trim()) return;

        try {
            const message = {
                chat_id: this.activeChat.id,
                sender_id: user.id,
                message_text: text.trim(),
                message_type: emojiData ? 'emoji' : 'text',
                emoji_data: emojiData,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([message])
                .select();

            if (error) throw error;

            // Обновляем последнее сообщение в чате
            await this.updateLastMessage(this.activeChat.id, text);

            // Сообщение будет добавлено через real-time
            // Но мы можем добавить его локально для мгновенного отображения
            if (data && data.length > 0) {
                this.messages.push(data[0]);
                this.renderMessages();
                this.scrollToBottom();
            }

            // Очищаем поле ввода
            const messageInput = document.getElementById('messageInput');
            if (messageInput) messageInput.value = '';

        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            showNotification('Ошибка при отправке сообщения');
        }
    }

    // Обновление последнего сообщения в чате
    async updateLastMessage(chatId, messageText) {
        try {
            const { error } = await supabase
                .from('chats')
                .update({
                    last_message: messageText,
                    last_message_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', chatId);

            if (error) throw error;
            
        } catch (error) {
            console.error('❌ Ошибка обновления последнего сообщения:', error);
        }
    }

    // Отметка сообщений как прочитанных
    async markMessagesAsRead(chatId) {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('chat_id', chatId)
                .neq('sender_id', user.id)
                .eq('is_read', false);

            if (error) throw error;
            
        } catch (error) {
            console.error('❌ Ошибка отметки сообщений как прочитанных:', error);
        }
    }

    // Начало звонка
    async startCall(receiverId) {
        if (!user) return;

        try {
            const callData = {
                caller_id: user.id,
                receiver_id: receiverId,
                status: 'calling',
                started_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('calls')
                .insert([callData])
                .select();

            if (error) throw error;

            // Создаем уведомление о звонке
            await notificationSystem.createNotification({
                title: 'Входящий звонок',
                message: `${this.getUserDisplayName(user.id)} звонит вам`,
                type: 'call',
                related_id: data[0].id
            });

            // Показываем интерфейс звонка
            this.showCallInterface(data[0], true);
            
        } catch (error) {
            console.error('❌ Ошибка начала звонка:', error);
        }
    }

    // Принятие звонка
    async acceptCall(callId) {
        try {
            const { error } = await supabase
                .from('calls')
                .update({
                    status: 'active',
                    started_at: new Date().toISOString()
                })
                .eq('id', callId);

            if (error) throw error;

            // Здесь будет логика WebRTC соединения
            console.log('📞 Звонок принят');
            
        } catch (error) {
            console.error('❌ Ошибка принятия звонка:', error);
        }
    }

    // Завершение звонка
    async endCall(callId) {
        try {
            const endedAt = new Date();
            const { data: callData } = await supabase
                .from('calls')
                .select('started_at')
                .eq('id', callId)
                .single();

            let duration = 0;
            if (callData && callData.started_at) {
                duration = Math.floor((endedAt - new Date(callData.started_at)) / 1000);
            }

            const { error } = await supabase
                .from('calls')
                .update({
                    status: 'ended',
                    ended_at: endedAt.toISOString(),
                    duration: duration
                })
                .eq('id', callId);

            if (error) throw error;

            // Скрываем интерфейс звонка
            this.hideCallInterface();
            
        } catch (error) {
            console.error('❌ Ошибка завершения звонка:', error);
        }
    }

    // Показать интерфейс звонка
    showCallInterface(callData, isCaller = false) {
        const callInterface = document.createElement('div');
        callInterface.className = 'call-interface';
        callInterface.id = 'callInterface';
        
        const participant = this.users.get(callData.receiver_id);
        const displayName = this.getUserDisplayName(callData.receiver_id);

        callInterface.innerHTML = `
            <div class="call-container">
                <div class="call-header">
                    <h3>${isCaller ? 'Исходящий звонок' : 'Входящий звонок'}</h3>
                    <div class="call-timer" id="callTimer">00:00</div>
                </div>
                <div class="call-user-info">
                    <div class="call-avatar">
                        <i class='bx bx-user'></i>
                    </div>
                    <div class="call-name">${displayName}</div>
                    <div class="call-status">${isCaller ? 'Звонок...' : 'Входящий вызов'}</div>
                </div>
                <div class="call-controls">
                    ${!isCaller ? `
                        <button class="call-btn accept" onclick="messengerSystem.acceptCall(${callData.id})">
                            <i class='bx bx-phone'></i>
                        </button>
                    ` : ''}
                    <button class="call-btn decline" onclick="messengerSystem.endCall(${callData.id})">
                        <i class='bx bx-phone-off'></i>
                    </button>
                </div>
            </div>
        `;

        // Добавляем стили
        if (!document.querySelector('#call-interface-styles')) {
            const styles = document.createElement('style');
            styles.id = 'call-interface-styles';
            styles.textContent = `
                .call-interface {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, var(--background), #16213e);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .call-container {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 2rem;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .call-header {
                    margin-bottom: 2rem;
                }
                .call-header h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text);
                }
                .call-timer {
                    font-size: 1.2rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .call-user-info {
                    margin-bottom: 2rem;
                }
                .call-avatar {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(45deg, var(--primary), var(--secondary));
                    border-radius: 50%;
                    margin: 0 auto 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    color: white;
                }
                .call-name {
                    font-size: 1.3rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: var(--text);
                }
                .call-status {
                    color: var(--text-secondary);
                }
                .call-controls {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                }
                .call-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .call-btn.accept {
                    background: var(--success);
                    color: white;
                }
                .call-btn.decline {
                    background: var(--error);
                    color: white;
                }
                .call-btn:hover {
                    transform: scale(1.1);
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(callInterface);
    }

    // Скрыть интерфейс звонка
    hideCallInterface() {
        const callInterface = document.getElementById('callInterface');
        if (callInterface) {
            callInterface.remove();
        }
    }

    // Получение отображаемого имени пользователя
    getUserDisplayName(telegramId) {
        const userData = this.users.get(telegramId);
        if (!userData) return 'Пользователь';
        
        return userData.display_name || 
               `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 
               userData.username || 
               'Пользователь';
    }

    // Показать профиль пользователя
    showUserProfile(telegramId) {
        const userData = this.users.get(telegramId);
        if (!userData) return;

        const profileModal = document.createElement('div');
        profileModal.className = 'modal show';
        profileModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Профиль пользователя</h3>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-profile">
                        <div class="profile-avatar-large">
                            <i class='bx bx-user'></i>
                        </div>
                        <div class="profile-info">
                            <h4 style="color: ${userData.nickname_color || '#667eea'}">
                                ${this.getUserDisplayName(telegramId)}
                            </h4>
                            ${userData.username ? `<p>@${userData.username}</p>` : ''}
                            ${userData.display_bio ? `<div class="user-bio">${userData.display_bio}</div>` : ''}
                            <div class="user-stats">
                                <div class="stat-item">
                                    <label>Зарегистрирован:</label>
                                    <span>${new Date(userData.registration_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="messengerSystem.startCall(${telegramId})">
                        <i class='bx bx-phone'></i>
                        Позвонить
                    </button>
                    <button class="btn-secondary" onclick="messengerSystem.openChat(${telegramId})">
                        <i class='bx bx-message'></i>
                        Написать сообщение
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(profileModal);
    }

    // Рендер списка чатов
    renderChatList() {
        const chatList = document.getElementById('chatList');
        if (!chatList) return;

        if (this.chats.length === 0) {
            chatList.innerHTML = `
                <div class="chats-empty">
                    <i class='bx bx-message-alt'></i>
                    <h3>Чатов пока нет</h3>
                    <p>Найдите пользователя чтобы начать общение</p>
                </div>
            `;
            return;
        }

        chatList.innerHTML = this.chats.map(chat => {
            // Находим участника чата (не текущего пользователя)
            const participantId = chat.participants?.find(p => p.telegram_id !== user.id)?.telegram_id;
            const participant = participantId ? this.users.get(participantId) : null;
            const displayName = participant ? this.getUserDisplayName(participantId) : 'Пользователь';

            return `
                <div class="chat-item ${this.activeChat?.id === chat.id ? 'active' : ''}" 
                     onclick="messengerSystem.openChat(${participantId})">
                    <div class="chat-avatar">
                        <i class='bx bx-user'></i>
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${displayName}</div>
                        <div class="chat-last-message">${chat.last_message || 'Нет сообщений'}</div>
                    </div>
                    <div class="chat-meta">
                        <div class="chat-time">${this.formatTime(chat.last_message_at || chat.created_at)}</div>
                        ${chat.unread_count > 0 ? `<div class="chat-unread">${chat.unread_count}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Рендер активного чата
    renderChat() {
        const chatContainer = document.getElementById('activeChat');
        if (!chatContainer || !this.activeChat) return;

        const participant = this.users.get(this.activeChat.participantId);
        const displayName = this.getUserDisplayName(this.activeChat.participantId);

        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-user-info">
                    <div class="chat-avatar">
                        <i class='bx bx-user'></i>
                    </div>
                    <div>
                        <div class="chat-user-name">${displayName}</div>
                        <div class="chat-user-status" id="typingIndicator"></div>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="chat-action-btn" onclick="messengerSystem.startCall(${this.activeChat.participantId})" title="Позвонить">
                        <i class='bx bx-phone'></i>
                    </button>
                    <button class="chat-action-btn" onclick="messengerSystem.showUserProfile(${this.activeChat.participantId})" title="Профиль">
                        <i class='bx bx-user'></i>
                    </button>
                </div>
            </div>
            <div class="chat-messages" id="chatMessages">
                ${this.renderMessages()}
            </div>
            <div class="chat-input-container">
                <div class="emoji-picker-container" id="emojiPicker" style="display: none;">
                    <div class="emoji-categories">
                        <button class="emoji-category active" data-category="smileys">😀</button>
                        <button class="emoji-category" data-category="people">👋</button>
                        <button class="emoji-category" data-category="nature">🐶</button>
                        <button class="emoji-category" data-category="food">🍕</button>
                        <button class="emoji-category" data-category="activities">⚽</button>
                    </div>
                    <div class="emoji-grid" id="emojiGrid">
                        <!-- Emojis will be loaded here -->
                    </div>
                </div>
                <div class="chat-input-wrapper">
                    <button class="emoji-toggle" onclick="messengerSystem.toggleEmojiPicker()">
                        <i class='bx bx-smile'></i>
                    </button>
                    <input type="text" id="messageInput" placeholder="Введите сообщение..." 
                           onkeypress="if(event.key === 'Enter') messengerSystem.sendMessage(this.value)">
                    <button class="send-btn" onclick="messengerSystem.sendMessage(document.getElementById('messageInput').value)">
                        <i class='bx bx-send'></i>
                    </button>
                </div>
            </div>
        `;

        this.scrollToBottom();
    }

    // Рендер сообщений
    renderMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return '';

        if (this.messages.length === 0) {
            return `
                <div class="messages-empty">
                    <i class='bx bx-message'></i>
                    <p>Начните общение</p>
                </div>
            `;
        }

        return this.messages.map(message => {
            const isOwn = message.sender_id === user.id;
            const senderName = isOwn ? 'Вы' : this.getUserDisplayName(message.sender_id);

            return `
                <div class="message ${isOwn ? 'own' : ''}">
                    <div class="message-content">
                        ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
                        <div class="message-bubble">
                            ${message.message_type === 'emoji' && message.emoji_data ? 
                                `<span class="message-emoji" style="font-size: ${message.emoji_data.size || '2rem'}">${message.emoji_data.emoji}</span>` :
                                `<div class="message-text">${message.message_text}</div>`
                            }
                        </div>
                        <div class="message-time">${this.formatTime(message.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Прокрутка вниз
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Переключение emoji picker
    toggleEmojiPicker() {
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker) {
            emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
            if (emojiPicker.style.display === 'block') {
                this.loadEmojis();
            }
        }
    }

    // Загрузка emojis
    loadEmojis() {
        const emojiGrid = document.getElementById('emojiGrid');
        if (!emojiGrid) return;

        // Простые emojis для демонстрации
        const emojis = {
            'smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
            'people': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍'],
            'nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄'],
            'food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🍳', '🥞', '🧇', '🍤', '🍗', '🍖', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛'],
            'activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🎿', '⛷️', '🏂']
        };

        emojiGrid.innerHTML = Object.values(emojis).flat().map(emoji => `
            <span class="emoji" onclick="messengerSystem.selectEmoji('${emoji}')">${emoji}</span>
        `).join('');
    }

    // Выбор emoji
    selectEmoji(emoji) {
        this.sendMessage('', { emoji: emoji, size: '2rem' });
        this.toggleEmojiPicker();
    }

    // Форматирование времени
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Настройка real-time подписки
    setupRealTime() {
        if (!user) return;

        // Подписка на новые сообщения
        supabase
            .channel('messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    // Проверяем, относится ли сообщение к активному чату
                    if (this.activeChat && payload.new.chat_id === this.activeChat.id) {
                        this.messages.push(payload.new);
                        this.renderMessages();
                        this.scrollToBottom();
                        
                        // Отмечаем как прочитанное
                        if (payload.new.sender_id !== user.id) {
                            this.markMessagesAsRead(this.activeChat.id);
                        }
                    }
                    
                    // Обновляем список чатов
                    this.loadChats();
                }
            )
            .subscribe();

        // Подписка на звонки
        supabase
            .channel('calls')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'calls',
                    filter: `receiver_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new.status === 'calling') {
                        this.showCallInterface(payload.new, false);
                    }
                }
            )
            .subscribe();
    }
}

// Создаем глобальный экземпляр
const messengerSystem = new MessengerSystem();

// Функция поиска пользователей для интерфейса
async function searchUsersHandler() {
    const searchInput = document.getElementById('userSearch');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!searchInput || !resultsContainer) return;

    const query = searchInput.value.trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    const users = await messengerSystem.searchUsers(query);
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<div class="search-empty">Пользователи не найдены</div>';
        return;
    }

    resultsContainer.innerHTML = users.map(user => `
        <div class="search-result-item" onclick="messengerSystem.openChat(${user.telegram_id})">
            <div class="user-avatar-small">
                <i class='bx bx-user'></i>
            </div>
            <div class="user-info">
                <div class="user-name" style="color: ${user.nickname_color || '#667eea'}">
                    ${messengerSystem.getUserDisplayName(user.telegram_id)}
                </div>
                <div class="user-username">${user.username ? '@' + user.username : ''}</div>
            </div>
            <button class="user-action-btn" onclick="event.stopPropagation(); messengerSystem.startCall(${user.telegram_id})">
                <i class='bx bx-phone'></i>
            </button>
        </div>
    `).join('');
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Ждем инициализации пользователя
    const initInterval = setInterval(() => {
        if (user) {
            messengerSystem.initialize();
            clearInterval(initInterval);
        }
    }, 100);
});
