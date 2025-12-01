# Teaching Guide for the Swayambhu Stories Educational Mode

This guide explains how teachers can use the Educational Mode of the Swayambhu Stories 3D experience, how to access annotations, how to pause or restart the experience during class, and how to project or share the model.  
This document reflects only the features currently implemented in the uploaded code and does not describe any unimplemented functionality.

---

## 1. What Educational Mode Does

Educational Mode is a simplified, classroom-friendly version of the 3D model.  
When selected, it:

- Loads the model with annotations enabled
- Allows students or teachers to click annotation markers placed throughout the environment
- Provides space for future educational material (interviews, documents, extended stories), even if some of that content is not yet implemented

Educational Mode does **not** modify movement settings, narration, pacing, difficulty, or camera behavior beyond enabling annotation visibility.

To enter Educational Mode:
1. Open the model page.
2. On the introduction screen, select **“Enter Educational Mode”**.

---

## 2. Accessing Annotations

Annotations are interactive markers in the 3D space.  
In Educational Mode, they are visible and clickable.

To use them:
1. Approach or look toward an annotation marker.
2. Click the marker to open its text panel.
3. Read the information provided.

Notes:
- Only annotations currently implemented in the code will appear.
- Some annotations may be placeholders for upcoming videos or cultural materials.

---

## 3. Pausing, Resuming, and Restarting During Class

The experience includes a built-in pause interface.

### How to Pause
The pause screen appears automatically when pointer lock is released (e.g., pressing Escape).

### Pause Screen Options
- **Resume**: Returns to the experience and re-locks the mouse.
- **Return to Introduction**: Brings you back to the Educational/Immersive mode selection screen.
- **Return to Landing**: Takes you back to the landing webpage.

These are the only available pause controls implemented in the experience.

---

## 4. Restarting the Experience

To restart for a new class period or group:

Option A — From Pause Screen  
Select **Return to Introduction** to reload the mode-selection screen.

Option B — Refresh  
Reloading the browser tab fully resets the experience.

Option C — Use the Landing Page  
Navigate back to the landing page and enter the model again through **Explore in 3D**.

---

## 5. Projecting the Model in a Classroom

The model can be projected from any device that supports WebGL and pointer-lock interactions.

Tips for projection:
- Use fullscreen mode for clearer display.
- Stand or sit near the computer to control camera movement smoothly.
- Students may momentarily lose visibility of the cursor during pointer-locked navigation; this is expected behavior.
- If you need to pause movement to explain something, press Escape to unlock the mouse.

No additional classroom-specific features are implemented beyond the pause UI.

---

## 6. Sharing the Experience With Students

The 3D experience can be shared directly via its URL.  
Students can explore in either Immersive Mode or Educational Mode.

Educational Mode is recommended when students need to view annotation points.

---

## 7. Technical Considerations

- A modern browser with WebGL support is required.
- Audio or video content will only appear once implemented in future annotation expansions.
- If the mouse stops responding, click inside the 3D view to re-enter pointer lock.
- If the screen appears frozen, press Escape to trigger the pause screen, then resume.

---

## 8. Quick Classroom Checklist

Before class:
- Open the model page
- Select **Educational Mode**
- Verify annotations appear

During class:
- Click annotations as discussion points
- Use Escape to pause when needed
- Resume when ready

After class:
- Restart using Return to Introduction or browser refresh
- Share the link for student review if desired

---
