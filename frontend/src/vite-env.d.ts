/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_PUSHER_KEY?: string;
  readonly VITE_PUSHER_CLUSTER?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_ENABLE_AI?: string;
  readonly VITE_ENABLE_CHAT?: string;
  readonly VITE_ENABLE_OFFICE365?: string;
  readonly VITE_DEFAULT_LANGUAGE?: string;
  readonly VITE_DEFAULT_THEME?: string;
  readonly VITE_MAX_FILE_SIZE?: string;
  readonly VITE_ALLOWED_FILE_TYPES?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OFFICE365_CLIENT_ID?: string;
  readonly VITE_OFFICE365_REDIRECT_URI?: string;
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}






