# Deploy to a VPS

The workflow builds two Linux AMD64 images in GHCR. The VPS runs the NestJS API and Caddy.
Caddy terminates HTTPS and proxies `/api` to NestJS, including authenticated attachment
downloads. API responses carry `Cache-Control: private, no-store`. Receipts are stored
over SFTP on the server behind [the media hostname](https://media-expense-tracker.spsyndicate.net/receipts).
MySQL runs on your database server and Vercel
serves the frontend.

The backend uses SFTP in development and production. Compose sets the base path so receipt keys go under
`/receipts/YYYY/MM/` as seen by the SFTP account. Set `SFTP_HOST`, `SFTP_PORT`,
`SFTP_USER` and `SFTP_PRIVATE_KEY` in the VPS backend environment. The SFTP account's
root must map `/receipts` to the intended receipt directory. The browser uses authenticated
API endpoints for both uploading and downloading receipts.

## Configure SSH and GHCR

1. Use a Linux AMD64 VPS with Docker Engine and the Compose plugin. Point your API hostname
   at the VPS and open TCP ports 80 and 443 plus your SSH port. Run the following as the
   deployment account, which must be able to run Docker.

   ```sh
   umask 077
   mkdir -p ~/.ssh ~/expense-tracker
   ssh-keygen -t ed25519 -f ~/.ssh/expense-actions -C github-actions-expense-tracker
   cat ~/.ssh/expense-actions.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

   Use a dedicated key. This workflow uses unattended SSH, so leave the passphrase empty.
   Store the complete private key as the `VPS_SSH_KEY` Actions secret in the `production`
   environment. Keep the public key in `authorized_keys`.

2. Store the VPS **host** public key as `VPS_KNOWN_HOSTS` in the same environment. Read it
   through your trusted VPS console with `sudo cat /etc/ssh/ssh_host_ed25519_key.pub`.
   The secret is a known_hosts line in the form `vps.example.com ssh-ed25519 AAAA…`.
   For a custom port, use `[vps.example.com]:2222 ssh-ed25519 AAAA…`. Use the exact host
   configured in the workflow and omit the public key's trailing comment.

3. For private images, authenticate to GHCR once on the VPS as the same deployment account.
   Use a classic GitHub token with `read:packages` and access to both packages.
   [GitHub Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

   ```bash
   read -rsp 'GHCR token: ' ghcr_token
   printf '\n'
   printf '%s' "$ghcr_token" | docker login ghcr.io --username YOUR_GITHUB_USER --password-stdin
   unset ghcr_token
   ```

## First deployment

1. Push the deployment files to `main`. Leave the `VPS_HOST` repository variable unset
   while preparing the VPS. The workflow publishes images using its built-in `GITHUB_TOKEN`.
   You can also run it manually with **publish_only** checked.
   [Publishing through GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)

2. Copy `compose.yaml` and the root `.env.example` to `~/expense-tracker` on the VPS.
   Rename `.env.example` to `.env` and run `chmod 600 .env`. Set `APP_SITE` to your API
   hostname, such as `api.expenses.example.com`. The backend allows requests from
   `https://expense-tracker.spsyndicate.net` and optionally one additional origin via `FRONTEND_ORIGIN`.
   Set `DB_HOST`,
   `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASS` for the second server and generate a
   separate random `JWT_SECRET`.

   Use a private network or VPN between the VPS and MySQL. Create the database and a dedicated
   application account on the database server, and allow MySQL connections from the backend
   VPS on that network. Use the database server's reachable private address for `DB_HOST`.

3. In `~/expense-tracker/.env`, replace `COMMIT_SHA` in `BACKEND_IMAGE` and `CDN_IMAGE`
   with the published commit SHA. If deploying from a fork, use that fork's GHCR package names.

   ```sh
   docker compose pull
   ```

4. For a **fresh database**, create the schema and the first Super Admin once. Enter a unique
   password when prompted. These shell variables are passed only to the temporary seed container.

   ```bash
   read -rp 'Super Admin email: ' SEED_ADMIN_EMAIL
   read -rsp 'Super Admin password: ' SEED_ADMIN_PASSWORD
   printf '\n'
   export SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
   docker compose run --rm \
     -e NODE_ENV=development -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD backend node dist/seed.js
   unset SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
   ```

   For an **existing database**, apply any pending SQL migrations on the database server in
   order before starting the new backend. If the old backend used local storage, copy its
   receipt files into the SFTP receipt directory before switching. Preserve the
   `YYYY/MM/filename` paths under `/receipts` so existing attachment records continue to work.
   [Backend migration instructions](../backend/README.md)

5. Start the stack. Caddy obtains the API certificate automatically
   once DNS is pointing to the VPS and the public HTTP and HTTPS ports are reachable.
   [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)

   ```sh
   docker compose up -d --wait
   docker compose ps
   ```

6. In Vercel, connect the repository, set the root directory to `frontend`, and use the Vite
   preset, then deploy. Production builds default to `https://expense-api.spsyndicate.net`.
   If `VITE_API_URL` is already set in Vercel, update it to that URL or remove it to use the default.
   The Vercel configuration supports direct links
   such as `/profile`. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

7. Set the repository variables `VPS_HOST`, `VPS_USER`, and optionally `VPS_PORT` (default
   `22`). Subsequent pushes to `main` deploy both images by digest. For a release with database
   migrations, unset `VPS_HOST` before merging so the workflow only publishes. Back up and migrate
   the database on the VPS, restore `VPS_HOST`, then run the deployment manually.

The workflow waits for the containers to become healthy before updating the image references in `.env`.
If startup fails after the pull, it attempts to restart the previous release. Back up the
database on the second server and the receipt volume on the VPS separately.
