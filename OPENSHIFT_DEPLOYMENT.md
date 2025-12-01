# Deploying to RedHat OpenShift (UNC Carolina CloudApps)

## Prerequisites

Before you begin, ensure you have:
- Access to UNC Carolina CloudApps (https://cloudapps.unc.edu)
- Git repository URL for this project
- Node.js upgraded locally (for testing builds)

## Step 1: Prepare Your Repository

### 1.1 Update Node.js Locally (Required for Testing)

Since you're using conda:
```bash
# Update Node.js to version 22
conda install -c conda-forge nodejs=22

# Verify the version
node --version  # Should show v22.x.x
```

### 1.2 Install Dependencies and Test Build

```bash
# Install dependencies
npm install

# Test the build locally
npm run build

# Preview the build (optional)
npm run preview
```

If the build succeeds, you're ready to deploy!

## Step 2: Commit and Push Changes

Make sure all the fixes are committed to your repository:

```bash
# Check git status
git status

# Add all changes
git add .

# Commit
git commit -m "Fix asset paths and add OpenShift deployment configuration"

# Push to your repository
git push origin main
```

## Step 3: Access UNC Carolina CloudApps

1. Go to https://cloudapps.unc.edu
2. Log in with your UNC credentials (Onyen)
3. Click on the OpenShift Web Console link

## Step 4: Create a New Project

1. In the OpenShift web console, click **"Create Project"** or select an existing project
2. Enter project details:
   - **Name**: `swayambhu-threejs` (or your preferred name)
   - **Display Name**: Swayambhu Stories
   - **Description**: 3D heritage visualization of Swayambhu temple

## Step 5: Deploy from Git Repository

### Option A: Using the Developer Console (Recommended for Beginners)

1. Switch to **Developer** perspective (top left dropdown)
2. Click **"+Add"** from the left sidebar
3. Select **"Import from Git"**
4. Enter your Git repository URL (e.g., `https://github.com/tssmith04/Swayambhu-ThreeJS`)
5. OpenShift will auto-detect the project type

#### Configure Build:
- **Builder Image**: Select **Node.js**
- **Builder Image Version**: Select **22-ubi9** (or latest available)
- **Application Name**: `swayambhu-app`
- **Name**: `swayambhu-web`

#### Advanced Options:
Click **"Show advanced Git options"** and configure:
- **Context Dir**: `/` (leave empty or root)
- **Git Reference**: `main` (or your branch name)

#### Build Configuration:
Click **"Build Configuration"** and add:
- **Environment Variables** (if needed):
  ```
  NODE_ENV=production
  ```

#### Deployment:
- **Create a route**: ✅ Checked
- **Secure Route**: ✅ Checked (for HTTPS)
- **Target Port**: 8080

6. Click **"Create"**

### Option B: Using Dockerfile (Recommended for Production)

1. In Developer perspective, click **"+Add"** → **"Import from Git"**
2. Enter your repository URL
3. OpenShift should detect the Dockerfile
4. Configure:
   - **Docker Strategy**: Selected automatically
   - **Application Name**: `swayambhu-app`
   - **Name**: `swayambhu-web`
   - **Create a route**: ✅ Checked
   - **Target Port**: 8080
5. Click **"Create"**

## Step 6: Configure Build Settings

After creating the application:

1. Go to **Builds** in the left sidebar
2. Click on your build config (e.g., `swayambhu-web`)
3. Go to **"Environment"** tab
4. Add environment variables if needed:
   ```
   NODE_VERSION=22
   NODE_ENV=production
   ```

## Step 7: Monitor the Build

1. Go to **Builds** → Select your build
2. Click on the running build (e.g., `#1`)
3. Click **"Logs"** to watch the build process
4. Wait for the build to complete (this may take 5-10 minutes)

Expected build stages:
- Cloning repository
- Installing dependencies (`npm install`)
- Building application (`npm run build`)
- Creating container image
- Deploying to OpenShift

## Step 8: Access Your Application

Once the build and deployment are complete:

1. Go to **Topology** view in Developer perspective
2. You'll see your application pod
3. Click on the **"Open URL"** icon (top-right of the pod circle)
   - OR find the route URL under **Networking** → **Routes**
4. Your application should open in a new tab!

## Step 9: Verify Everything Works

Check the following:

- ✅ Landing page loads with proper styling
- ✅ Background images are visible
- ✅ Navigation header appears correctly
- ✅ Links work (Home, About pages)
- ✅ 3D model page loads (`/model` route)
- ✅ Temple 3D model renders properly

## Troubleshooting

### Issue: Build Fails with Node.js Version Error

**Solution**: Specify Node.js version in build config
1. Go to **Builds** → Your build config
2. Click **"Environment"** tab
3. Add: `NODE_VERSION=22`
4. Start a new build

### Issue: "Application is not available" or 404

**Solution**: Check the route configuration
1. Go to **Networking** → **Routes**
2. Verify the route exists and has a hostname
3. Check pod logs: **Topology** → Click pod → **Logs** tab

### Issue: Styling is Missing

**Solution**: This should be fixed by the changes we made, but if still broken:
1. Check browser console for 404 errors
2. Verify the build completed successfully
3. Check that all files are in the `dist/` folder after build
4. Ensure `publicDir: 'public'` is in vite.config.ts

### Issue: 3D Model Doesn't Load

**Solution**: Check file size and CORS
1. Verify `/models/temple_opt.glb` file exists in `public/models/`
2. Check browser console for errors
3. Ensure files are being served from correct path

### Issue: Build Takes Too Long or Times Out

**Solution**: Increase build resources
1. Go to **Builds** → Your build config
2. Click **"YAML"** view
3. Add resource limits:
```yaml
resources:
  limits:
    memory: 2Gi
    cpu: '2'
  requests:
    memory: 1Gi
    cpu: '1'
```

## Updating Your Application

To deploy updates:

### Method 1: Automatic (Webhooks)
1. Configure a webhook in GitHub/GitLab to trigger builds on push
2. Go to **Builds** → Your build config → **Webhooks**
3. Copy the webhook URL
4. Add it to your Git repository settings

### Method 2: Manual
1. Push changes to your Git repository
2. In OpenShift, go to **Builds** → Your build config
3. Click **"Start Build"**
4. Wait for build and deployment to complete

## Configuration Files Reference

Your repository now includes:

- ✅ `Dockerfile` - Container configuration for OpenShift
- ✅ `nginx.conf` - Web server configuration
- ✅ `.dockerignore` - Files to exclude from build
- ✅ `vite.config.ts` - Build configuration with multi-page support
- ✅ Fixed asset paths in HTML and CSS files

## Important Notes for OpenShift

1. **Port**: OpenShift requires apps to run on port 8080 (configured in Dockerfile)
2. **Non-root user**: The Dockerfile runs nginx as non-root (OpenShift requirement)
3. **Permissions**: Directories have proper group permissions for OpenShift
4. **Build time**: First build may take 5-10 minutes; subsequent builds are faster
5. **Resource limits**: Default limits may be restrictive; adjust if needed

## Common OpenShift Commands (CLI)

If you have `oc` CLI installed:

```bash
# Login to OpenShift
oc login https://openshift.unc.edu

# List projects
oc projects

# Switch to your project
oc project swayambhu-threejs

# Get all resources
oc get all

# Watch build logs
oc logs -f bc/swayambhu-web

# Get route URL
oc get route

# Trigger a new build
oc start-build swayambhu-web

# Check pod status
oc get pods

# View pod logs
oc logs -f <pod-name>
```

## Support

If you encounter issues:

1. Check OpenShift pod logs for errors
2. Check browser console for client-side errors
3. Verify build completed successfully
4. Contact UNC ITS CloudApps support: https://help.unc.edu

## Success Checklist

Before considering deployment complete:

- [ ] Application builds successfully
- [ ] Deployment pod is running
- [ ] Route is accessible via HTTPS
- [ ] Landing page displays with styling
- [ ] Images load correctly
- [ ] Navigation works
- [ ] 3D model page loads
- [ ] Temple model renders in 3D viewer
- [ ] Mobile view works (if applicable)

---

**Your application should now be successfully deployed on UNC Carolina CloudApps!**

The URL will be something like:
`https://swayambhu-web-swayambhu-threejs.apps.cloudapps.unc.edu`
