# SmartCell — App Android e iPhone

## 1. Notificações em tempo real (já ativo)

O cliente ativa as notificações em **Minha conta → "Ativar notificações"**.
A partir daí ele recebe um aviso no celular sempre que o pedido muda de status
(pagamento aprovado, em separação, enviado, pronto para retirada, entregue,
cancelado ou estornado). A atualização chega em tempo real pelo banco de dados,
sem precisar recarregar a página.

Observações por plataforma:
- **Android (Chrome / PWA instalado / app Capacitor):** funciona direto.
- **iPhone:** é preciso adicionar o site à Tela de Início (Safari → Compartilhar
  → Adicionar à Tela de Início) e então permitir notificações. Exigência da Apple.
- Notificações com o app **fechado** exigem FCM (Android) + APNs (Apple), que
  dependem de contas de desenvolvedor. Posso implementar quando as contas
  estiverem criadas.

## 2. Instalável pelo navegador (já funciona)

- **Android (Chrome):** menu ⋮ → "Instalar aplicativo".
- **iPhone (Safari):** Compartilhar → "Adicionar à Tela de Início".

## 3. Builds nativos (AAB e IPA)

Importante: o AAB e o IPA **não podem ser gerados aqui**. O Google exige o
Android SDK/Gradle e a Apple exige um Mac com Xcode e certificados assinados
com a sua conta — nenhum dos dois roda no ambiente do Lovable. Os arquivos são
gerados na sua máquina com os comandos abaixo (o projeto já está configurado).

### Preparação (uma vez)

```bash
git clone <url-do-seu-repositorio>
cd <projeto>
npm install
npm run build
npx cap add android      # requer Android Studio
npx cap add ios          # requer Mac + Xcode
npx cap sync
```

### Android — gerar o AAB para a Google Play

1. Crie a chave de assinatura (guarde bem, sem ela não dá para atualizar o app):
   ```bash
   keytool -genkey -v -keystore smartcell.keystore -alias smartcell \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Em `android/gradle.properties` adicione:
   ```
   RELEASE_STORE_FILE=../../smartcell.keystore
   RELEASE_STORE_PASSWORD=sua-senha
   RELEASE_KEY_ALIAS=smartcell
   RELEASE_KEY_PASSWORD=sua-senha
   ```
3. Gere o pacote:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
   Saída: `android/app/build/outputs/bundle/release/app-release.aab`
4. No Google Play Console: criar app → Produção → enviar o `.aab` →
   preencher ficha da loja, política de privacidade e classificação etária.

Conta de desenvolvedor Google Play: US$ 25 (pagamento único).

### iPhone — gerar o IPA para a App Store

1. `npx cap open ios`
2. No Xcode: **Signing & Capabilities** → selecione seu Team (Apple Developer) e
   confirme o Bundle Identifier `store.smartcel.app`.
3. Menu **Product → Archive** → **Distribute App → App Store Connect**.
   O IPA é assinado e enviado direto para a Apple.
4. Em App Store Connect: preencher ficha, capturas de tela e enviar para revisão.

Conta Apple Developer: US$ 99/ano + Mac obrigatório.

## 4. Configuração do Capacitor (validada)

| Item | Valor |
|---|---|
| appId | `store.smartcel.app` |
| appName | `SmartCell` |
| webDir | `dist/client` (saída do `npm run build`) |
| server.url | `https://www.smartcel.store` — o app carrega o site publicado |
| esquemas | `https` no Android e iOS (cookies e login funcionam) |
| allowNavigation | site, Mercado Pago e backend liberados dentro do app |
| cleartext / mixed content | desativados (só HTTPS) |
| fundo | preto `#000000`, combinando com o tema |

Ícones: use `public/icon-512.png` como fonte no gerador de ícones do
Android Studio / Xcode.
