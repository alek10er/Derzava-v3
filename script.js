// Глобальные переменные
let tg = null;
let user = null;
let currentUserData = null;
let selectedClass = null;

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

// Проверка регистрации пользователя
async function checkUserRegistration() {
    try {
        displayRegistrationInfo();
        
        const userData = await getUserData(user.id);
        
        if (userData) {
            // Пользователь уже зарегистрирован
            console.log('Пользователь найден в базе:', userData);
            currentUserData = userData;
            showMainApp();
        } else {
            // Новый пользователь - показываем экран регистрации
            console.log('Пользователь не найден, показываем регистрацию');
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
    const profileFirstName = document.getElementById('profileFirstName');
    const profileLastName = document.getElementById('profileLastName');
    const profileClass = document.getElementById('profileClass');
    const profileUsername = document.getElementById('profileUsername');
    const profileRegDate = document.getElementById('profileRegDate');
    
    const firstName = currentUserData.first_name || '';
    const lastName = currentUserData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
    userClass.textContent = `${currentUserData.class} класс`;
    
    // Заполняем профиль
    profileFirstName.textContent = firstName || 'Не указано';
    profileLastName.textContent = lastName || 'Не указано';
    profileClass.textContent = currentUserData.class || 'Не указан';
    profileUsername.textContent = currentUserData.username ? `@${currentUserData.username}` : 'Не указан';
    
    // Форматируем дату регистрации
    if (currentUserData.registration_date) {
        const regDate = new Date(currentUserData.registration_date);
        profileRegDate.textContent = regDate.toLocaleDateString('ru-RU');
    } else {
        profileRegDate.textContent = 'Не указана';
    }
    
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

// Завершение регистрации
async function completeRegistration() {
    if (!selectedClass || !user) {
        showError('Пожалуйста, выберите класс');
        return;
    }
    
    const regBtn = document.getElementById('completeRegistrationBtn');
    regBtn.disabled = true;
    regBtn.textContent = 'Регистрируем...';
    
    try {
        const userData = {
            telegram_id: user.id,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || '',
            class: selectedClass,
            registration_date: new Date().toISOString(),
            is_active: true
        };
        
        console.log('Регистрируем пользователя:', userData);
        
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
            
        if (error) {
            console.error('Ошибка регистрации:', error);
            
            // Если пользователь уже существует (дубликат)
            if (error.code === '23505') {
                console.log('Пользователь уже зарегистрирован, загружаем данные...');
                const existingUser = await getUserData(user.id);
                if (existingUser) {
                    currentUserData = existingUser;
                    showMainApp();
                    return;
                }
            }
            
            throw error;
        }
        
        console.log('✅ Пользователь успешно зарегистрирован:', data);
        currentUserData = data;
        
        // Показываем анимацию успеха
        regBtn.textContent = '✅ Регистрация успешна!';
        
        // Показываем главное приложение через секунду
        setTimeout(() => {
            showMainApp();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Ошибка при регистрации:', error);
        showError(`Ошибка регистрации: ${error.message}`);
        regBtn.disabled = false;
        regBtn.textContent = 'Завершить регистрацию';
    }
}

// Получение данных пользователя
async function getUserData(telegramId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Пользователь не найден
            }
            console.error('Ошибка получения пользователя:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка в getUserData:', error);
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

// Функции для профиля
function editProfile() {
    showNotification('Функция редактирования профиля скоро будет доступна');
}

function showSettings() {
    showNotification('Настройки будут доступны в следующем обновлении');
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        showNotification('Выход из системы...');
        // Здесь будет логика выхода
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// Функции для заметок
function createNewNote() {
    showNotification('Создание заметок будет доступно в следующем обновлении');
}

// Показать уведомление
function showNotification(message) {
    // Временное решение - можно заменить на красивый toast
    alert(message);
}

// Показать ошибку
function showError(message) {
    showNotification(`Ошибка: ${message}`);
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

// Экспортируем функции для глобального использования
window.selectClass = selectClass;
window.completeRegistration = completeRegistration;
window.showSection = showSection;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.editProfile = editProfile;
window.showSettings = showSettings;
window.logout = logout;
window.createNewNote = createNewNote;

// Утилиты для отладки
window.getCurrentUser = () => currentUserData;
window.getTelegramUser = () => user;
