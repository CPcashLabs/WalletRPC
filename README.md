## Project Overview

WalletRPC is a multi-chain wallet application focused on RPC-driven account operations and transaction flows.  
It supports importing mnemonic/private key wallets, viewing balances and transaction history, sending native/token transfers, and managing Safe-style multi-signature workflows.  
The project also includes automated unit, component, and end-to-end UI test suites to verify critical wallet behaviors.

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing Commands

### Install test browsers (first time only)
`npm run test:e2e:install`

### Unit + component tests (Vitest)
`npm run test`

### E2E UI tests (Playwright)
- Headless (default):
  `npm run test:e2e`
- Headed (show browser window):
  `npm run test:e2e -- --headed`
- Interactive UI mode:
  `npm run test:e2e:ui`

### Run all tests
`npm run test:all`
