// Глобальные переменные
let tg = null;
let user = null;
let currentUserData = null;
let selectedClass = null;

// Переменные для заметок
let notes = [];
let currentEditingNote = null;
let noteColor = '#667eea';

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
    
    // Загружаем данные для определенных разделов
    if (sectionName === 'notes') {
        loadNotes();
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
        let result;
        
        if (currentEditingNote) {
            // Обновление существующей заметки
            const { data, error } = await supabase
                .from('notes')
                .update({
                    title: title,
                    content: content,
                    category: category,
                    is_pinned: isPinned,
                    color: noteColor,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentEditingNote.id)
                .select()
                .single();
                
            if (error) throw error;
            result = data;
            
        } else {
            // Создание новой заметки
            const { data, error } = await supabase
                .from('notes')
                .insert([{
                    telegram_id: user.id,
                    title: title,
                    content: content,
                    category: category,
                    is_pinned: isPinned,
                    color: noteColor
                }])
                .select()
                .single();
                
            if (error) throw error;
            result = data;
        }
        
        showNotification(currentEditingNote ? 'Заметка обновлена!' : 'Заметка создана!');
        closeNoteModal();
        await loadNotes(); // Перезагружаем список заметок
        
    } catch (error) {
        console.error('Ошибка сохранения заметки:', error);
        showNotification('Ошибка при сохранении заметки');
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

// Функция для создания новой заметки (из заглушки)
function createNewNote() {
    showNoteModal();
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

// Утилиты для отладки
window.getCurrentUser = () => currentUserData;
window.getTelegramUser = () => user;
window.getNotes = () => notes;
