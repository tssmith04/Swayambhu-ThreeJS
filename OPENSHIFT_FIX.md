# URGENT FIX: Files Not Found in OpenShift

## Problem
Your OpenShift deployment is missing CSS, JS, and image files because the build output isn't being served correctly.

## Root Cause
OpenShift deployed your source code directly without building and serving the `dist/` folder properly.

## IMMEDIATE FIX - Follow These Steps:

### Step 1: Update Your Local Repository

I've already updated these files:
- ✅ `package.json` - Added `start` script and `serve` package
- ✅ `serve.json` - Configuration for serving built files
- ✅ `openshift.json` - OpenShift build configuration

### Step 2: Commit and Push Changes

```bash
# Check what changed
git status

# Add all changes
git add package.json serve.json openshift.json

# Commit
git commit -m "Fix OpenShift deployment - add start script and serve config"

# Push to repository
git push origin main
```

### Step 3: Delete and Redeploy in OpenShift

#### Option A: Redeploy Using Web Console (EASIEST)

1. **Go to OpenShift Console**: https://cloudapps.unc.edu
2. **Select your project**: `bmkaheel`
3. **Delete the current deployment**:
   - Go to **Topology** view
   - Click on your app `swayambhu-three-js`
   - Click **Actions** → **Delete Deployment**
   - Confirm deletion

4. **Create new deployment**:
   - Click **"+Add"**
   - Select **"Import from Git"**
   - Enter repository URL: `https://github.com/tssmith04/Swayambhu-ThreeJS`
   - OpenShift will detect Node.js
   
5. **Configure the deployment**:
   - **Builder Image**: Node.js
   - **Builder Image Version**: `22-ubi9` or `22`
   - **Application Name**: `swayambhu-app`
   - **Name**: `swayambhu-three-js`
   
6. **IMPORTANT - Add Environment Variables**:
   Click **"Build Configuration"** → **"Environment Variables"** and add:
   ```
   NPM_RUN = build
   NODE_VERSION = 22
   ```

7. **Configure Route**:
   - ✅ Check **"Create a route"**
   - ✅ Check **"Secure Route"** (for HTTPS)
   - Target Port: `8080`

8. **Click "Create"**

#### Option B: Trigger Rebuild (IF YOU WANT TO KEEP EXISTING DEPLOYMENT)

1. Go to **Builds** in OpenShift Console
2. Find your build config: `swayambhu-three-js`
3. Click **Actions** → **Edit BuildConfig**
4. Add environment variables in the YAML:
   ```yaml
   spec:
     strategy:
       sourceStrategy:
         env:
           - name: NPM_RUN
             value: "build"
           - name: NODE_VERSION
             value: "22"
   ```
5. Save and click **"Start Build"**

### Step 4: Verify the Build

1. Go to **Builds** → Click on the running build
2. Click **"Logs"** tab
3. Watch for these key stages:
   ```
   ✓ Cloning repository
   ✓ npm install (installing dependencies)
   ✓ npm run build (building the app)
   ✓ Build completed successfully
   ```

4. **Look for these success messages**:
   ```
   vite build
   ✓ XXX modules transformed
   ✓ built in XXXms
   ```

### Step 5: Wait for Deployment

- Build takes 5-10 minutes
- Deployment takes 1-2 minutes
- Pod should show **"Running"** status

### Step 6: Test Your Application

Visit your route URL: `https://swayambhu-three-js-bmkaheel.apps.cloudapps.unc.edu`

**Check these things work**:
- ✅ Page loads with styling
- ✅ No 404 errors in browser console (F12)
- ✅ Background images visible
- ✅ Navigation header appears correctly
- ✅ Click "About" page - should work
- ✅ Click "Explore in 3D" - model page should load

## What the Fix Does

### Before (BROKEN):
```
OpenShift → Serves source files from /opt/app-root/src/
           → landing.css NOT FOUND ❌
           → landing.js NOT FOUND ❌
           → Assets NOT FOUND ❌
```

### After (FIXED):
```
OpenShift → Runs npm install
         → Runs npm run build (vite build)
         → Creates dist/ folder with all built files
         → Runs npm start
         → Serves files from dist/ folder ✅
         → All CSS, JS, and images available ✅
```

## Troubleshooting

### If build fails with "Node.js version" error:

Add this to BuildConfig environment variables:
```yaml
NODE_VERSION: "22"
```

### If you still see 404 errors after rebuild:

1. Check the build logs to confirm build succeeded
2. Check pod logs to see where it's serving from:
   ```bash
   # In pod logs, you should see:
   Serving! dist/ folder
   ```

3. If serving from wrong folder, update `package.json` start script:
   ```json
   "start": "npm run build && npx serve dist -l 8080 -s"
   ```

### If the pod fails to start:

1. Go to **Topology** → Click pod → **Logs**
2. Look for error messages
3. Common issue: Port conflict
   - Solution: Ensure serving on port 8080

### Check what files were built:

In OpenShift pod terminal (Topology → Pod → Terminal):
```bash
ls -la dist/
# Should see:
# index.html
# about.html
# model.html
# assets/ (folder with CSS, JS, images)
```

## Alternative: Use Dockerfile Instead

If the above doesn't work, switch to Dockerfile deployment:

1. In OpenShift, delete current deployment
2. Click **"+Add"** → **"Import from Git"**
3. OpenShift should detect Dockerfile automatically
4. Select **"Dockerfile"** strategy
5. Create the deployment

The Dockerfile I created handles everything automatically.

## Verification Commands (OpenShift CLI)

If you have `oc` CLI:

```bash
# Check build logs
oc logs -f bc/swayambhu-three-js

# Check pod logs
oc logs -f deployment/swayambhu-three-js

# Get route
oc get route

# Check if dist folder exists in pod
oc rsh deployment/swayambhu-three-js ls -la dist/
```

## Expected Result

After fix, you should see in logs:
```
✓ vite build completed
✓ dist/ folder created with:
  - index.html
  - about.html  
  - model.html
  - assets/ (CSS, JS, images, models)
✓ Serving on port 8080
✓ Application accessible
```

Browser should show:
- ✅ Full styling applied
- ✅ All images loading
- ✅ Navigation working
- ✅ 3D model loads

---

**After following these steps, your styling should appear correctly!**
