// notifications.js - Система уведомлений

class NotificationSystem {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.isInitialized = false;
    }

    // Инициализация системы уведомлений
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.loadNotifications();
            this.setupRealTime();
            this.isInitialized = true;
            console.log('✅ Система уведомлений инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации уведомлений:', error);
        }
    }

    // Загрузка уведомлений
    async loadNotifications() {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('telegram_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.notifications = data || [];
            this.updateUnreadCount();
            this.renderNotifications();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки уведомлений:', error);
        }
    }

    // Обновление счетчика непрочитанных
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
        this.updateBadge();
    }

    // Обновление бейджа уведомлений
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Создание уведомления
    async createNotification(notificationData) {
        if (!user) return;

        try {
            const notification = {
                telegram_id: user.id,
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'info',
                related_id: notificationData.related_id || null,
                is_read: false,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('notifications')
                .insert([notification])
                .select();

            if (error) throw error;

            // Добавляем новое уведомление в начало списка
            if (data && data.length > 0) {
                this.notifications.unshift(data[0]);
                this.updateUnreadCount();
                this.renderNotifications();
            }

            // Показываем toast уведомление
            this.showToastNotification(notification);

        } catch (error) {
            console.error('❌ Ошибка создания уведомления:', error);
        }
    }

    // Показать toast уведомление
    showToastNotification(notification) {
        // Создаем элемент toast
        const toast = document.createElement('div');
        toast.className = `notification-toast ${notification.type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class='bx bx-${this.getNotificationIcon(notification.type)}'></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class='bx bx-x'></i>
            </button>
        `;

        // Добавляем стили
        if (!document.querySelector('#notification-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-toast-styles';
            styles.textContent = `
                .notification-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    max-width: 350px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                    border-left: 4px solid var(--primary);
                }
                .notification-toast.info { border-left-color: var(--primary); }
                .notification-toast.success { border-left-color: var(--success); }
                .notification-toast.warning { border-left-color: var(--warning); }
                .notification-toast.error { border-left-color: var(--error); }
                .toast-icon {
                    font-size: 1.5rem;
                    color: var(--primary);
                }
                .toast-success .toast-icon { color: var(--success); }
                .toast-warning .toast-icon { color: var(--warning); }
                .toast-error .toast-icon { color: var(--error); }
                .toast-content {
                    flex: 1;
                }
                .toast-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: var(--text);
                }
                .toast-message {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.3;
                }
                .toast-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }
                .toast-close:hover {
                    background: var(--surface-light);
                    color: var(--text);
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Получение иконки для типа уведомления
    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'error',
            'error': 'x-circle',
            'message': 'message',
            'call': 'phone'
        };
        return icons[type] || 'bell';
    }

    // Отметить уведомление как прочитанное
    async markAsRead(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;

            // Обновляем локальные данные
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.is_read = true;
                this.updateUnreadCount();
                this.renderNotifications();
            }

        } catch (error) {
            console.error('❌ Ошибка отметки уведомления как прочитанного:', error);
        }
    }

    // Отметить все как прочитанные
    async markAllAsRead() {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('telegram_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            // Обновляем локальные данные
            this.notifications.forEach(n => n.is_read = true);
            this.updateUnreadCount();
            this.renderNotifications();

        } catch (error) {
            console.error('❌ Ошибка отметки всех уведомлений как прочитанных:', error);
        }
    }

    // Удалить уведомление
    async deleteNotification(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            // Удаляем из локальных данных
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.updateUnreadCount();
            this.renderNotifications();

        } catch (error) {
            console.error('❌ Ошибка удаления уведомления:', error);
        }
    }

    // Рендер списка уведомлений
    renderNotifications() {
        const notificationsList = document.querySelector('.notifications-list');
        if (!notificationsList) return;

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="notifications-empty">
                    <i class='bx bx-bell-off'></i>
                    <p>Уведомлений пока нет</p>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? '' : 'new'}" 
                 onclick="notificationSystem.markAsRead(${notification.id})">
                <i class='bx bx-${this.getNotificationIcon(notification.type)}'></i>
                <div class="notification-content">
                    <p>${notification.title}</p>
                    <span>${this.formatTime(notification.created_at)}</span>
                </div>
                <button class="notification-delete" onclick="event.stopPropagation(); notificationSystem.deleteNotification(${notification.id})">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `).join('');
    }

    // Форматирование времени
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'только что';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        
        return date.toLocaleDateString('ru-RU');
    }

    // Настройка real-time подписки
    setupRealTime() {
        if (!user) return;

        // Подписка на новые уведомления
        supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `telegram_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('🔔 Новое уведомление:', payload.new);
                    this.notifications.unshift(payload.new);
                    this.updateUnreadCount();
                    this.renderNotifications();
                    this.showToastNotification(payload.new);
                }
            )
            .subscribe();
    }
}

// Создаем глобальный экземпляр
const notificationSystem = new NotificationSystem();

// Функции для глобального доступа
window.markAllNotificationsAsRead = () => notificationSystem.markAllAsRead();
window.deleteAllNotifications = async () => {
    if (!user) return;
    
    if (confirm('Удалить все уведомления?')) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('telegram_id', user.id);

            if (error) throw error;

            notificationSystem.notifications = [];
            notificationSystem.updateUnreadCount();
            notificationSystem.renderNotifications();
            showNotification('Все уведомления удалены');

        } catch (error) {
            console.error('❌ Ошибка удаления всех уведомлений:', error);
            showNotification('Ошибка при удалении уведомлений');
        }
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Ждем инициализации пользователя
    const initInterval = setInterval(() => {
        if (user) {
            notificationSystem.initialize();
            clearInterval(initInterval);
        }
    }, 100);
});
