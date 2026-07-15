import './bootstrap';
import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';

const appName = import.meta.env.VITE_APP_NAME || 'PlanTim';

// i18n configuration
const i18n = createI18n({
    legacy: false,
    locale: 'bs',
    fallbackLocale: 'en',
    messages: {
        bs: {},
        en: {},
    },
});

// Pinia store
const pinia = createPinia();

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const app = createApp({ render: () => h(App, props) });
        
        app.use(plugin)
           .use(i18n)
           .use(pinia);
        
        // Global error handler
        app.config.errorHandler = (err, vm, info) => {
            console.error('Vue error:', err, info);
        };
        
        app.mount(el);
        
        return app;
    },
    progress: {
        color: '#0ea5e9',
        showSpinner: true,
    },
});

