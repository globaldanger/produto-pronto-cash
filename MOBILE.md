# SmartCell — App Android e iPhone

## 1. Instalável pelo navegador (já funciona)

O site agora é um PWA instalável. Depois de publicar:

- **Android (Chrome):** menu ⋮ → "Instalar aplicativo" / "Adicionar à tela inicial".
- **iPhone (Safari):** botão Compartilhar → "Adicionar à Tela de Início".

O app abre em tela cheia, com ícone dourado próprio, sem barra do navegador.
Nada para configurar e sem custo.

## 2. App nativo nas lojas (Capacitor)

O projeto já tem `capacitor.config.ts` configurado. O app nativo carrega
`https://www.smartcel.store`, então atualizações do site aparecem no app sem
precisar reenviar para as lojas.

No **seu computador** (o Lovable não roda builds nativos):

```bash
git clone <url-do-seu-repositorio>
cd <projeto>
npm install
npx cap add android      # precisa de Android Studio
npx cap add ios          # precisa de Mac + Xcode
npm run build
npx cap sync
npx cap open android     # ou: npx cap open ios
```

Depois é só gerar o APK/AAB no Android Studio e o build no Xcode.

Requisitos das lojas:
- Google Play: conta de desenvolvedor (US$ 25, pagamento único).
- App Store: conta Apple Developer (US$ 99/ano) + Mac.

Ícones: use `public/icon-512.png` como fonte no gerador de ícones do
Android Studio / Xcode.