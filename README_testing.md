# Test Plan and How to Run the Tests

> Project: **Swayambhu Stories** (Vite + TypeScript + Three.js + static HTML)  
> Date: 2025-11-05  

This document contains two parts:
1. **Ideal plan** if we had unlimited time and resources.
2. **Actual scope** we will execute and ship with this repository, including exactly **who** runs what, **where**, and **how**.

---

## Part 1 — Ideal Plan (Unlimited Time)

### Goals
- Verify correctness of rendering logic, scene graph setup, asset loading fallbacks, controls, and simple navigation.
- Verify robustness to asset failures and degraded devices.
- Guard against regressions via automated suites, CI, and performance budgets.

### Scope
- **Unit tests (wide coverage):**
    - Pure utility functions.
    - Math helpers for DPR clamping, deadzones, easing curves.
    - Texture and material post-processing helpers through pure-function refactoring.
- **Integration/System tests with UI (browser):**
    - Smoke tests for landing and model pages.
    - Pointer-lock state machine and pause/resume overlay.
    - “Enter” flow from intro to canvas and back.
    - Progress bar visibility and updates during loader lifecycle.
    - Defensive behavior when `/models/*.glb` or `/models/skybox.exr` are missing.
- **Cross-environment matrix:**
    - OS: macOS 14, Windows 11, Ubuntu 22.04.
    - Browsers: Chrome 141, Firefox 131, Safari 17.
- **Performance and reliability:**
    - Metrics via Playwright + Lighthouse CI.
    - DOMContentLoaded < 1.5 s on 4×CPU slowdown.
    - Frame-time ≤ 12 ms avg, ≤ 25 ms p95.
    - Memory ceiling verified with full assets.
- **Accessibility smoke:** landmarks, contrast, focus trapping.
- **Acceptance testing:** client walkthrough verifying landing, “Enter / Pause / Resume / Return” flows.
- **CI/CD:** GitHub Actions running unit + e2e; coverage gates; HTML reports.

---

## Part 2 — Actual Scope We Ship Now

### Why limited
We target **browser-level behavior**.

### What we test now
- **Unit tests (Vitest):**
    - `lib/utils.ts` → `cn()` utility.
- **End-to-end tests (Playwright):**
    - **Landing page**: expected elements, nav links `/about` and `/model`.
    - **Model page**: intro visible → Enter hides intro → app container and `<canvas>` appear → Return toggles back.
    - **Resilience without assets**: UI responsive after missing model loads.
    - **Basic performance capture**: records Navigation Timing JSON.

Pointer-lock not tested in CI; DOM toggles verified instead.

### Test environments & versions
| Component | Version |
|------------|----------|
| Node | 20.11.x LTS |
| npm | 10.x |
| Vite | 7.1.9 |
| TypeScript | 5.9.3 |
| Three.js | 0.180.0 |
| Vitest | 2.1.5 |
| @vitest/coverage-v8 | 2.1.5 |
| Playwright | 1.48.2 |
| OS targets | macOS 14.5 / Windows 11 23H2 / Ubuntu 22.04 |
| Browsers | Chromium (default) / optional Firefox & WebKit |

### Who tests & when
- **Unit tests** – every developer pre-commit; CI on PRs.  
  Instructor command:
  ```bash
  npm ci
  npm run test:unit
  ```
- **E2E tests** – team integrator weekly; instructor command:
  ```bash
  npm ci
  npm run build
  npm run test:e2e
  ```
Playwright starts `vite preview` on port 4173 and targets  
`http://localhost:4173/index.html` and `/model.html`.

### Tools used
- **Vitest** (+ V8 coverage)
- **Playwright** (browser automation)
- **jsdom** (optional DOM env)
- Reports: console + HTML in `playwright-report/`

---

## Running the Tests

```bash
# 1. Install dependencies
nvm use 20 || true
npm ci

# 2. Unit tests + coverage
npm run test:unit

# 3. E2E tests
npm run build
npm run test:e2e

# 4. View Playwright HTML report
npx playwright show-report
```

---

## Manual Test Cases (for client SMEs)

| ID | Page | Steps | Expected |
|----|------|--------|-----------|
| M-01 | Landing | Open `/index.html` | Header, “Swayambhu Stories” title, “Explore in 3D” button. |
| M-02 | Landing → Model | Check links `/about`, `/model` | Both anchors exist with correct hrefs. |
| M-03 | Model intro | Open `/model.html` | Intro overlay visible; “Enter” button visible. |
| M-04 | Enter | Click **Enter** | Intro hidden; `#application-container` visible; `#app canvas` exists. |
| M-05 | Pause/Resume | Press Esc → Resume | Pause UI shows; Resume re-locks pointer or hides overlay (mobile). |
| M-06 | Return | Click **Return to Introduction** | Intro visible again; app container hidden. |
| M-07 | Missing assets | Remove `/public/models` | No JS fatal errors; UI buttons work. |

Document outcomes + screenshots per session.

### Error and data conditions
- Missing `.glb` and `.exr`: covered by e2e.
- Slow network: simulate with Playwright throttling (optional).
- Touch devices: DOM toggle smoke test only.

---

## Appendix — Acceptance Checklist

- [ ] Landing content accurate
- [ ] “Explore in 3D” navigates correctly
- [ ] Intro / Enter / Pause / Resume / Return flows ok
- [ ] Progress bar appears on load
- [ ] No fatal errors without assets
- [ ] Desktop and mobile shell render ok
