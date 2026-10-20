# Simple IHM

Aplicação web em React, TypeScript e Vite, também preparada para rodar como aplicativo Android usando Capacitor.

## Executar no Android

1. Instale o Android Studio e configure o Android SDK.
2. Na pasta `dashboard`, execute `npm install`.
3. Para compilar a interface e sincronizar o app nativo, execute `npm run android:sync`.
4. Abra o projeto com `npm run android:open` ou abra a pasta `dashboard/android` no Android Studio.
5. Conecte o celular com a depuração USB habilitada (ou inicie um emulador) e pressione **Run** no Android Studio.

No Android Studio, configure **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK** para usar o JDK 21.

O app usa a API publicada configurada em `src/config.ts`. O celular precisa de acesso à internet para receber dados do servidor.

## Acesso e perfis

Toda a plataforma exige autenticação em `POST /login`; o token JWT retornado é enviado como Bearer nas chamadas protegidas da API. Os perfis são `ADMIN`, `MANUTENCAO` e `OPERADOR`: administradores têm acesso às telas de gestão e à auditoria, manutenção pode alterar ordens de manutenção, e operadores consultam essas ordens em modo somente leitura. A API deve permitir `GET /manutencoes` também para `OPERADOR`, sem conceder permissões de escrita.
