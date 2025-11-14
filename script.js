// Глобальные переменные
let tg = null;
let user = null;
let currentUserData = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegramApp();
    setupEventListeners();
    showSection('news'); // Показываем новости по умолчанию
});

// Инициализация Telegram Web App
function initializeTelegramApp() {
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
            displayUserInfo(user);
            loadUserData();
        } else {
            console.log('Телеграм данные не получены, режим тестирования');
            simulateTelegramUser();
        }
        
    } catch (error) {
        console.error('Ошибка инициализации Telegram:', error);
        simulateTelegramUser();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Уведомления
    document.getElementById('notificationBell').addEventListener('click', toggleNotifications);
    
    // Закрытие уведомлений при клике вне области
    document.addEventListener('click', function(event) {
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationBell = document.getElementById('notificationBell');
        
        if (!notificationsPanel.contains(event.target) && !notificationBell.contains(event.target)) {
            closeNotifications();
        }
    });
}

// Отображение информации о пользователе
function displayUserInfo(userData) {
    const welcomeText = document.getElementById('welcomeText');
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
    
    // Устанавливаем аватар если есть
    if (userData.photo_url) {
        document.getElementById('userAvatar').src = userData.photo_url;
        document.getElementById('userAvatar').style.display = 'block';
        document.getElementById('avatarPlaceholder').style.display = 'none';
    }
}

// Загрузка данных пользователя из базы
async function loadUserData() {
    if (!user) return;
    
    try {
        const userData = await getUserData(user.id);
        if (userData) {
            currentUserData = userData;
            updateProfileInfo(userData);
            document.getElementById('userClass').textContent = `${userData.class} класс`;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Получение данных пользователя
async function getUserData(telegramId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
        
    if (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
    
    return data;
}

// Обновление информации в профиле
function updateProfileInfo(userData) {
    document.getElementById('profileFirstName').textContent = userData.first_name || 'Не указано';
    document.getElementById('profileLastName').textContent = userData.last_name || 'Не указано';
    document.getElementById('profileClass').textContent = userData.class || 'Не указан';
    document.getElementById('profileUsername').textContent = userData.username ? `@${userData.username}` : 'Не указан';
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
    panel.classList.toggle('show');
}

function closeNotifications() {
    const panel = document.getElementById('notificationsPanel');
    panel.classList.remove('show');
}

// Симуляция пользователя для тестирования
function simulateTelegramUser() {
    user = {
        id: 123456789,
        first_name: 'Иван',
        last_name: 'Тестовый',
        username: 'test_user',
        photo_url: ''
    };
    
    displayUserInfo(user);
    
    // Симулируем данные пользователя
    currentUserData = {
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        class: '9А',
        registration_date: new Date().toISOString()
    };
    
    updateProfileInfo(currentUserData);
    document.getElementById('userClass').textContent = '9А класс';
    
    console.log('⚠️ Режим тестирования (вне Telegram)');
}

// Функции для будущего использования
function openMessenger() {
    showSection('messenger');
    // Здесь будет логика открытия мессенджера
}

function openAI() {
    showSection('ai');
    // Здесь будет логика открытия ИИ
}

function openNotes() {
    showSection('notes');
    // Здесь будет логика открытия заметок
}

function openSchedule() {
    showSection('schedule');
    // Здесь будет логика открытия расписания
}

// Экспортируем функции для глобального использования
window.showSection = showSection;
window.toggleNotifications = toggleNotifications;
window.closeNotifications = closeNotifications;
window.openMessenger = openMessenger;
window.openAI = openAI;
window.openNotes = openNotes;
window.openSchedule = openSchedule;
