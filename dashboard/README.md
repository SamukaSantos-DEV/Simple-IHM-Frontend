# Simple IHM

Aplicação web em React, TypeScript e Vite, também preparada para rodar como aplicativo Android usando Capacitor.

## Executar no Android

1. Instale o Android Studio e configure o Android SDK.
2. Na pasta `dashboard`, execute `npm install`.
3. Para compilar a interface e sincronizar o app nativo, execute `npm run android:sync`.
4. Abra o projeto com `npm run android:open` ou abra a pasta `dashboard/android` no Android Studio.
5. Conecte o celular com a depuração USB habilitada (ou inicie um emulador) e pressione **Run** no Android Studio.

O app usa a API publicada configurada em `src/config.ts`. O celular precisa de acesso à internet para receber dados do servidor.
