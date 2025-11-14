// Глобальные переменные
let tg = null;
let user = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegramApp();
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
            checkUserRegistration(user.id);
        } else {
            showError('Не удалось получить данные пользователя');
        }
        
    } catch (error) {
        console.error('Ошибка инициализации Telegram:', error);
        // Для тестирования вне Telegram
        simulateTelegramUser();
    }
}

// Отображение информации о пользователе
function displayUserInfo(userData) {
    const welcomeText = document.getElementById('welcome-text');
    const userId = document.getElementById('user-id');
    const username = document.getElementById('username');
    
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    welcomeText.textContent = `Добро пожаловать, ${fullName || 'Пользователь'}!`;
    userId.textContent = `ID: ${userData.id}`;
    username.textContent = `@${userData.username || 'username_not_set'}`;
}

// Проверка регистрации пользователя
async function checkUserRegistration(telegramId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();
            
        if (error && error.code !== 'PGRST116') { // PGRST116 - нет данных
            console.error('Ошибка проверки пользователя:', error);
            return;
        }
        
        if (data) {
            // Пользователь уже зарегистрирован
            document.getElementById('class-selection').style.display = 'none';
            document.getElementById('login-btn').textContent = 'Перейти в личный кабинет';
        } else {
            // Новый пользователь - показываем выбор класса
            document.getElementById('class-selection').style.display = 'block';
            document.getElementById('login-btn').textContent = 'Завершить регистрацию';
        }
        
    } catch (error) {
        console.error('Ошибка при проверке регистрации:', error);
    }
}

// Выбор класса
let selectedClass = null;

function selectClass(className) {
    selectedClass = className;
    
    // Сбрасываем стили всех кнопок
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.style.background = 'rgba(102, 126, 234, 0.2)';
        btn.style.border = '2px solid #667eea';
    });
    
    // Подсвечиваем выбранную кнопку
    event.target.style.background = 'rgba(102, 126, 234, 0.6)';
    event.target.style.border = '2px solid #4ade80';
    
    console.log(`Выбран класс: ${className}`);
}

// Обработка входа/регистрации
async function handleLogin() {
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Обработка...';
    
    try {
        if (!user) {
            throw new Error('Данные пользователя не получены');
        }
        
        // Проверяем, зарегистрирован ли пользователь
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', user.id)
            .single();
            
        if (existingUser) {
            // Пользователь уже зарегистрирован - просто переходим
            redirectToDashboard();
        } else {
            // Новый пользователь - регистрируем
            if (!selectedClass) {
                throw new Error('Пожалуйста, выберите класс');
            }
            
            await registerNewUser(selectedClass);
            redirectToDashboard();
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showError(error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти в систему';
    }
}

// Регистрация нового пользователя
async function registerNewUser(className) {
    const userData = {
        telegram_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        class: className,
        registration_date: new Date().toISOString(),
        is_active: true
    };
    
    const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
        
    if (error) {
        throw new Error(`Ошибка регистрации: ${error.message}`);
    }
    
    console.log('Пользователь зарегистрирован:', data);
    return data;
}

// Переход в личный кабинет
function redirectToDashboard() {
    // В будущем здесь будет переход в ЛК
    // Сейчас просто покажем сообщение
    const loginBtn = document.getElementById('login-btn');
    loginBtn.textContent = 'Регистрация успешна!';
    loginBtn.style.background = '#4ade80';
    
    setTimeout(() => {
        // Временный редирект - позже заменим на реальный
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Показать ошибку
function showError(message) {
    // Можно улучшить отображение ошибок
    alert(`Ошибка: ${message}`);
}

// Симуляция пользователя для тестирования вне Telegram
function simulateTelegramUser() {
    user = {
        id: 123456789,
        first_name: 'Иван',
        last_name: 'Тестовый',
        username: 'test_user'
    };
    
    displayUserInfo(user);
    document.getElementById('class-selection').style.display = 'block';
    
    console.log('⚠️ Режим тестирования (вне Telegram)');
}
