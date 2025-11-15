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
    
    registrationScreen.style.display = 'flex';
    appContainer.style.display = 'none';
    
    // Сбрасываем выбор класса
    selectedClass = null;
    updateClassButtons();
    updateRegistrationButton();
}

// Показать главное приложение
function showMainApp() {
    const registrationScreen = document.getElementById('registrationScreen');
    const appContainer = document.getElementById('appContainer');
    
    registrationScreen.style.display = 'none';
    appContainer.style.display = 'block';
    
    // Инициализируем главное приложение
    setupEventListeners();
    loadMainAppData();
    showSection('news');
}

// Загрузка данных для главного приложения
function loadMainAppData() {
    if (!currentUserData) return;
    
    const welcomeText = document.getElementById('welcomeText');
    const userClass = document.getElementById('userClass');
    
    const firstName = currentUserData.first_name || '';
    const lastName = currentUserData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
    userClass.textContent = `${currentUserData.class} класс`;
    
    // Устанавливаем аватар если есть
    if (user?.photo_url) {
        document.getElementById('userAvatar').src = user.photo_url;
        document.getElementById('userAvatar').style.display = 'block';
        document.getElementById('avatarPlaceholder').style.display = 'none';
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
    if (selectedClass) {
        regBtn.disabled = false;
        regBtn.textContent = `Завершить регистрацию в ${selectedClass} классе`;
    } else {
        regBtn.disabled = true;
        regBtn.textContent = 'Выберите класс для продолжения';
    }
}

// Завершение регистрации (ИСПРАВЛЕННАЯ ВЕРСИЯ)
async function completeRegistration() {
    if (!selectedClass || !user) {
        showNotification('Пожалуйста, выберите класс');
        return;
    }
    
    const regBtn = document.getElementById('completeRegistrationBtn');
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

            // Вручную берем первый элемент
            if (data && data.length > 0) {
                console.log('✅ Данные пользователя обновлены:', data[0]);
                currentUserData = data[0];
            } else {
                console.log('⚠️ Данные не возвращены, но ошибки нет');
                // Обновляем данные вручную
                const userData = await getUserData(user.id);
                if (userData) {
                    currentUserData = userData;
                }
            }
            
            // Проверяем, требуется ли пароль
            if (currentUserData.account_password) {
                console.log('🔐 Требуется пароль для существующего аккаунта');
                regBtn.textContent = '✅ Данные обновлены!';
                
                setTimeout(() => {
                    showPasswordLogin(currentUserData);
                }, 1000);
                return;
            } else {
                // Входим без пароля
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
            
            // Если пользователь уже существует (дубликат) - повторная проверка
            if (error.code === '23505') {
                console.log('ℹ️ Пользователь уже зарегистрирован, загружаем данные...');
                const existingUserData = await getUserData(user.id);
                if (existingUserData) {
                    currentUserData = existingUserData;
                    
                    // Проверяем пароль
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

        // Вручную берем первый элемент
        if (data && data.length > 0) {
            console.log('✅ Пользователь успешно зарегистрирован:', data[0]);
            currentUserData = data[0];
        } else {
            console.log('⚠️ Данные не возвращены, но ошибки нет');
            // Получаем данные вручную
            const userData = await getUserData(user.id);
            if (userData) {
                currentUserData = userData;
            }
        }
        
        // Показываем анимацию успеха
        regBtn.textContent = '✅ Регистрация успешна!';
        
        // Показываем главное приложение через секунду
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

// Получение данных пользователя (ОБНОВЛЕННАЯ)
async function getUserData(telegramId) {
    try {
        console.log('🔍 Ищем пользователя с ID:', telegramId);
        
        // Убираем .single() и используем .maybeSingle() или обрабатываем массив
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .limit(1); // Используем limit вместо single
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ Пользователь не найден');
                return null;
            }
            console.error('❌ Ошибка получения пользователя:', error);
            return null;
        }
        
        // Возвращаем первый элемент массива или null
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
    document.getElementById('notificationBell').addEventListener('click', toggleNotifications);
    
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
}

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
    }
    
    // Закрываем уведомления при переключении секций
    closeNotifications();
}

// Управление уведомлениями
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.toggle('show');
    }
}

function closeNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.remove('show');
    }
}

// ==============================
// СИСТЕМА ПРОФИЛЯ (ИСПРАВЛЕННАЯ)
// ==============================

// Загрузка данных профиля
function loadProfileData() {
    if (!currentUserData) {
        console.log('❌ Нет данных пользователя для загрузки профиля');
        return;
    }
    
    console.log('📊 Загружаем данные профиля:', currentUserData);
    
    // Основная информация
    document.getElementById('profileTelegramId').textContent = currentUserData.telegram_id || '-';
    document.getElementById('profileFirstName').textContent = currentUserData.first_name || 'Не указано';
    document.getElementById('profileLastName').textContent = currentUserData.last_name || 'Не указано';
    document.getElementById('profileClass').textContent = currentUserData.class || 'Не указан';
    document.getElementById('profileUsername').textContent = currentUserData.username ? `@${currentUserData.username}` : 'Не указан';
    
    // Форматируем дату регистрации
    if (currentUserData.registration_date) {
        const regDate = new Date(currentUserData.registration_date);
        document.getElementById('profileRegDate').textContent = regDate.toLocaleDateString('ru-RU');
    } else {
        document.getElementById('profileRegDate').textContent = 'Не указана';
    }
    
    // Загружаем настройки профиля
    loadProfileSettings();
}

function loadProfileSettings() {
    console.log('⚙️ Загружаем настройки профиля:', {
        display_name: currentUserData.display_name,
        display_bio: currentUserData.display_bio,
        nickname_color: currentUserData.nickname_color
    });
    
    // Отображаемое имя
    document.getElementById('displayName').value = currentUserData.display_name || '';
    
    // Описание профиля
    document.getElementById('displayBio').value = currentUserData.display_bio || '';
    
    // Цвет ника
    const savedColor = currentUserData.nickname_color || '#667eea';
    selectNicknameColor(savedColor);
}

function selectNicknameColor(color) {
    nicknameColor = color;
    const colorOptions = document.querySelectorAll('.color-option-small');
    colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === color) {
            option.classList.add('selected');
        }
    });
    document.getElementById('nicknameColor').value = color;
}

// ИСПРАВЛЕННАЯ функция сохранения настроек профиля
async function saveProfileSettings() {
    if (!user || !currentUserData) {
        showNotification('Ошибка: пользователь не авторизован');
        return;
    }
    
    const displayName = document.getElementById('displayName').value.trim();
    const displayBio = document.getElementById('displayBio').value.trim();
    
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
        
        // Убираем .single() чтобы избежать ошибки JSON object
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('telegram_id', user.id)
            .select(); // Убрали .single()
            
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

// ИСПРАВЛЕННАЯ функция установки пароля
async function setAccountPassword() {
    const password = document.getElementById('accountPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
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
        
        // Убираем .single() чтобы избежать ошибки JSON object
        const { data, error } = await supabase
            .from('users')
            .update({
                account_password: password,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_id', user.id)
            .select(); // Убрали .single()
            
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
        document.getElementById('accountPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
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
    modal.classList.add('show');
    
    // Фокусируемся на поле ввода
    setTimeout(() => {
        document.getElementById('loginPassword').focus();
    }, 100);
}

// Функция проверки пароля
async function verifyPassword() {
    const password = document.getElementById('loginPassword').value;
    
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
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
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
    modal.classList.remove('show');
    document.getElementById('loginPassword').value = '';
    pendingLoginUser = null;
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

// ИСПРАВЛЕННАЯ функция выхода
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
    modal.classList.remove('show');
    currentEditingNote = null;
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
    document.getElementById('noteColor').value = color;
}

// Сохранение заметки
async function saveNote() {
    if (!user) {
        showNotification('Ошибка: пользователь не авторизован');
        return;
    }
    
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const category = document.getElementById('noteCategory').value;
    const isPinned = document.getElementById('notePinned').checked;
    
    if (!title) {
        showNotification('Пожалуйста, введите заголовок заметки');
        return;
    }
    
    const saveBtn = document.getElementById('saveNoteBtn');
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
    const searchTerm = document.getElementById('notesSearch').value.toLowerCase();
    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        (note.content && note.content.toLowerCase().includes(searchTerm))
    );
    displayNotes(filteredNotes);
}

// Фильтрация заметок
function filterNotes() {
    const category = document.getElementById('notesCategoryFilter').value;
    const searchTerm = document.getElementById('notesSearch').value.toLowerCase();
    
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
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================

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
        'ideas': 'Идеи'
    };
    return categories[category] || category;
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
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

// Показать уведомление
function showNotification(message) {
    // Временное решение - можно заменить на красивый toast
    alert(message);
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
    
    // Для тестирования показываем регистрацию
    displayRegistrationInfo();
    showRegistrationScreen();
}

// Функция для создания новой заметки
function createNewNote() {
    showNoteModal();
}

// Функции для профиля (заглушки)
function editProfile() {
    showNotification('Функция редактирования профиля скоро будет доступна');
}

function showSettings() {
    showNotification('Настройки будут доступны в следующем обновлении');
}

// Функция сброса состояния регистрации
function resetRegistrationState() {
    selectedClass = null;
    const classButtons = document.querySelectorAll('.class-btn');
    classButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    updateRegistrationButton();
}

// ==============================
// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ==============================

window.selectClass = selectClass;
window.completeRegistration = completeRegistration;
window.showSection = showSection;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.editProfile = editProfile;
window.showSettings = showSettings;
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
