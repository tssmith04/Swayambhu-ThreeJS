# Deployment Fixes for OpenShift

## Issues Fixed

### 1. Asset Path References
All asset paths have been updated from relative (`./`, `../`) to absolute (`/`) paths to work correctly with the Vite build process:

- **HTML files**: `index.html`, `about.html`
- **CSS file**: `public/landing.css`

### 2. Vite Configuration
Updated `vite.config.ts` with:
- Multiple HTML entry points (index, about, model)
- Proper build output configuration
- Base path set to `'./'` for flexible deployment

### 3. Missing Image Files
The following images are referenced but not found in the repository:
- `Nepal-14-min.jpg` (used as background)
- `Swayambhunath_161106-97.jpg` (used for mission background)

## Build Instructions

### For Local Development:
```bash
npm install
npm run dev
```

### For Production Build:
```bash
npm install
npm run build
```

The built files will be in the `dist/` directory.

## OpenShift Deployment

### Important Configuration

1. **Ensure the build command is set correctly**:
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Required Node.js Version**:
   - Node.js 20.19+ or 22.12+ (current: 20.3.0 is too old)
   - Update Node.js in your OpenShift deployment configuration

3. **Static File Serving**:
   OpenShift needs to serve the built static files from the `dist/` directory.

### Dockerfile Example (if needed):
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Use a lightweight server
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf Example:
```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /about {
        try_files $uri /about.html;
    }

    location /model {
        try_files $uri /model.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|wasm|exr|glb)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Verification Steps

After deployment, verify:

1. **CSS is loading**: Check browser DevTools Network tab
2. **Images are displaying**: All background and foreground images
3. **3D model loads**: The `/model` page should load the temple model
4. **Navigation works**: All links between pages function correctly

## Troubleshooting

### If styles are still missing:

1. Check the build output:
   ```bash
   npm run build
   ls -la dist/
   ```

2. Verify that `landing.css` and `landing.js` are in `dist/` after build

3. Check browser console for 404 errors

4. Verify OpenShift is serving from the correct directory (`dist/`)

### If images are missing:

1. Ensure all images are in `public/assets/images/`
2. Check that the `public` directory is included in the build
3. Verify image file names match exactly (case-sensitive)

## Changes Made

### Files Modified:
- ✅ `index.html` - Fixed all asset paths
- ✅ `about.html` - Fixed all asset paths  
- ✅ `public/landing.css` - Fixed background image URLs
- ✅ `vite.config.ts` - Added multi-page build configuration

### Key Changes:
- Changed `href="./landing.css"` → `href="/landing.css"`
- Changed `src="assets/images/..."` → `src="/assets/images/..."`
- Changed CSS `url("../images/...")` → `url("/assets/images/...")`
- Added `base: './'` to Vite config for deployment flexibility
