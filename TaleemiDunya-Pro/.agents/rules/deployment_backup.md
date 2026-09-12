# Deployment Backup Rule

Whenever the user requests a deployment or feature update to Firebase or any other hosting, you MUST ALWAYS perform the following backup steps automatically without waiting for the user to ask:

1. Backup the currently deployed build (e.g., `dist` folder) to `dist_backup_old` (or similar descriptive name).
2. Run the build process (e.g., `npm run build`).
3. Backup the newly created build (e.g., the new `dist` folder) to `dist_backup_new` (or similar descriptive name).
4. Proceed with the deployment.

This ensures that there is always a recovery path available in case of deployment issues.
