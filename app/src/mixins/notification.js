import "../elements/notification.js";

let notificationSingleton;

export function NotificationMixin(baseClass) {
    return class NotificationMixin extends baseClass {
        notify(message, type, duration) {
            if (!notificationSingleton) {
                notificationSingleton = document.createElement("pl-notification");
                document.body.appendChild(notificationSingleton);
                notificationSingleton.offsetLeft;
            }

            return notificationSingleton.show(message, type, duration);
        }
    };
}
