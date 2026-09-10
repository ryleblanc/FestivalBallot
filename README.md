# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Festival Ballot

  A mobile-first TIFF companion for Ryder and Yashvi. Each person can privately:

  - log watched films from the 32-item TIFF 2026 itinerary;
  - place each film with quick head-to-head comparisons;
  - drag or nudge the resulting forced ranking;
  - nominate films, people, and credited work in all 24 Academy Award categories;
  - add a short reflection to each nomination; and
  - seal their ballot, reveal both together, and choose shared festival winners.

  The React app is static and deploys to GitHub Pages. A private Google Sheet, exposed only through a token-protected Apps Script web app, stores the two independent ballots and shared winners.

  ## Run locally

  Requirements: Node.js 22 or newer and npm.

  ```bash
  npm install
  npm run dev
  ```

  Without an invite key, the app runs in local preview mode. Use Settings to switch between Ryder and Yashvi. This mode is useful for testing, but both ballots live in the same browser and are not private from each other.

  Quality checks:

  ```bash
  npm test
  npm run lint
  npm run build
  ```

  ## Set up Google Sheets

  1. Create a private Google Sheet named **Festival Ballot**.
  2. In that Sheet, open **Extensions > Apps Script**.
  3. Replace the editor contents with [google-apps-script/Code.gs](google-apps-script/Code.gs).
  4. In **Project Settings**, enable the `appsscript.json` manifest. Replace it with [google-apps-script/appsscript.json](google-apps-script/appsscript.json).
  5. Select `setupFestivalBallot` in the function menu and click **Run**.
  6. Approve the requested access to the current spreadsheet.
  7. Open the execution log and record the separate Ryder and Yashvi invite keys. They are shown only when setup or key rotation runs.
  8. Select **Deploy > New deployment > Web app**.
  9. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then deploy.
  10. Copy the web app URL ending in `/exec`.

  The Sheet itself stays private. The web app executes as its owner and accepts only a valid invite key. It returns the caller's ballot and the other person's ready/not-ready state; it returns both ballots only after both are sealed.

  ## Deploy to GitHub Pages

  1. Create a GitHub repository and push this project to its `main` branch.
  2. In **Settings > Secrets and variables > Actions**, add a repository secret named `VITE_SHEETS_API_URL` containing the Apps Script `/exec` URL.
  3. In **Settings > Pages**, choose **GitHub Actions** as the source.
  4. Run the **Deploy Festival Ballot** workflow, or push to `main`.

  The Vite build uses relative asset paths, so both user/organization Pages and repository Pages URLs work.

  Create the two private links by appending each key to the deployed URL:

  ```text
  https://YOUR-NAME.github.io/YOUR-REPOSITORY/?key=RYDER_KEY
  https://YOUR-NAME.github.io/YOUR-REPOSITORY/?key=YASHVI_KEY
  ```

  Send each person only their own link. Invite keys are bearer credentials: anyone with one can act as that person. Never commit them, put them in screenshots, or add them to GitHub secrets. If a link leaks, run `rotateInviteKeys` in Apps Script and issue both links again.

  If the build-time endpoint secret is not configured, an invite link prompts once for the Apps Script URL and saves it in that browser.

  ## Updating the backend

  After changing [google-apps-script/Code.gs](google-apps-script/Code.gs), create a new Apps Script deployment version from **Deploy > Manage deployments**. Keep the existing deployment URL so installed links continue to work.

  ## Data ownership

  - Offline and unsynced changes are cached in the browser immediately.
  - The Sheet stores one JSON ballot row per participant and one row per chosen award winner.
  - Removing a watched film also removes it from that person's ranking and nominations.
  - Reopening either sealed ballot hides the joint reveal again. Existing shared winners remain stored but are not returned until both ballots are sealed again.
  - A ballot can be downloaded as JSON from Settings.
