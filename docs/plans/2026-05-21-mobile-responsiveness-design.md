# Mobile Responsiveness & Dual-Joystick Control Design Document

This design document outlines the architecture, layout structure, interactive behaviors, and mobile touch enhancements required to make the 3D Solar System Hud fully responsive, touch-friendly, and gamified on mobile devices.

---

## 1. Objectives

- **Responsive layouts:** Adjust the topbar controls, navigation, and detail drawers to fit elegantly on mobile screens (portrait and landscape, viewport widths $320\text{px} - 900\text{px}$).
- **Touch-optimized UI:** Re-engineer the navigation sidebar into a bottom horizontal swipeable carousel of planet cards, and wrap the topbar controls into a collapsible gear-triggered settings drawer.
- **Futuristic Dual Virtual Joysticks:** Allow mobile users to pan/navigate the solar system flat plane using a hidden left joystick and orbit-rotate the camera using a hidden right joystick.
- **Lightbox enhancements:** Add double-tap zoom, swipe-to-dismiss, and pinch-to-zoom gestures for high-fidelity interactive infographics.

---

## 2. Component Architecture

We will implement **Approach A (Hybrid CSS & Shared Event-Binding)**, using CSS media queries to hide desktop overlays and show mobile-optimized elements.

### HTML DOM Additions (`index.html`)

```html
<!-- Mobile Toggle Menu Button -->
<button id="mobile-menu-toggle" class="hud-btn mobile-only-btn" title="Open Controls">⚙️ HUD CONTROLS</button>

<!-- Mobile Settings Drawer -->
<div id="mobile-settings-drawer" class="mobile-hud-drawer">
  <div class="drawer-header">
    <h3>HUD SYSTEM SETTINGS</h3>
    <button id="mobile-drawer-close" class="close-btn">✕</button>
  </div>
  <div class="drawer-content">
    <!-- Repositioned controls for small screens -->
    <div class="mobile-control-group">
      <span class="control-label">Orbits Stream</span>
      <button id="mobile-toggle-orbits-btn" class="hud-btn">Active</button>
    </div>
    <div class="mobile-control-group">
      <span class="control-label">Scale Mode</span>
      <button id="mobile-toggle-scale-btn" class="hud-btn">Visual</button>
    </div>
    <div class="mobile-control-group">
      <span class="control-label">Sim Speed</span>
      <div class="hud-slider-container">
        <button id="mobile-play-pause-btn" class="hud-btn active">⏸</button>
        <input type="range" id="mobile-speed-slider" class="hud-slider" min="0" max="50" value="10">
        <span id="mobile-speed-val" class="hud-slider-val">1.0x</span>
      </div>
    </div>
    <div class="mobile-control-group">
      <button id="mobile-reset-cam-btn" class="hud-btn full-width-btn">🌌 Reset Space Grid</button>
    </div>
  </div>
</div>

<!-- Mobile Bottom Carousel Navigation (Horizontal Swipe) -->
<div id="mobile-planet-carousel" class="mobile-carousel-container">
  <!-- Dynamic cards inserted via JS or statically in HTML -->
  <div class="mobile-carousel-track" id="mobile-carousel-track">
    <!-- Generated dynamically in app.js for planetary items -->
  </div>
</div>

<!-- Mobile Floating Helper Bubble -->
<div id="mobile-help-bubble" class="mobile-help-bubble">
  <div class="pulse-dot"></div>
  <span>TAP CELESTIAL BODY OR SWIPE TO NAVIGATE</span>
</div>

<!-- Virtual Hidden Joysticks -->
<div id="joystick-left" class="virtual-joystick">
  <div class="joystick-ring">
    <div class="joystick-knob"></div>
  </div>
</div>
<div id="joystick-right" class="virtual-joystick">
  <div class="joystick-ring">
    <div class="joystick-knob"></div>
  </div>
</div>
```

---

## 3. Dynamic Controls & Joysticks Integration

### Dual Control Synchronization
In `app.js`, listeners will be registered to both desktop and mobile buttons. State updates (orbits toggle, scale toggles, speed sliders, play/pause states) will update visual classes (`.active` / `.textContent`) on both button pairs to maintain absolute state synchronization.

### Hidden Virtual Joysticks
Two touch regions will trigger hidden virtual joysticks:

```
+--------------------------+--------------------------+
|                          |                          |
|      LEFT HALF           |      RIGHT HALF          |
|                          |                          |
|   Left Joystick Trigger  |  Right Joystick Trigger  |
|    (Plane Navigation)    |   (Camera Orbit Rotation)|
|                          |                          |
+--------------------------+--------------------------+
```

1. **Left Joystick (Plane Panning):**
   - Active when touch begins on the left 50% of the screen.
   - Knobs and outer rings render at `clientX` and `clientY` positions, fading in to `opacity: 0.8`.
   - On `touchmove`, calculates `leftJoystickX` and `leftJoystickY` clamped to radius `40px`.
   - In `animate()`, translates `camera.position` and `controls.target` along the horizontal $X\text{-}Z$ camera plane:
     $$\vec{V}_{\text{forward}} = \text{normalize}(\vec{C}_{\text{dir}})_{Y=0}$$
     $$\vec{V}_{\text{right}} = \vec{V}_{\text{forward}} \times \vec{U}_{\text{world}}$$
     $$\text{Movement} = (\vec{V}_{\text{forward}} \cdot \text{JoystickY} + \vec{V}_{\text{right}} \cdot \text{JoystickX}) \cdot \text{speed}$$
2. **Right Joystick (Camera Orbit Rotation):**
   - Active when touch begins on the right 50% of the screen.
   - Calculates clamped rotation coordinates `rightJoystickX` and `rightJoystickY`.
   - Modifies Three.js `OrbitControls` polar and azimuthal angles directly:
     ```javascript
     const azimuth = this.controls.getAzimuthalAngle();
     const polar = this.controls.getPolarAngle();
     this.controls.setAzimuthalAngle(azimuth + rightJoystickX * 0.03);
     this.controls.setPolarAngle(THREE.MathUtils.clamp(polar + rightJoystickY * 0.03, 0.1, Math.PI / 2 - 0.05));
     ```

---

## 4. Touch Gestures & Lightbox

- **Double-tap zoom:** Tracks intervals between subsequent `touchend` events. Tapping twice in <300ms toggles image scale between `1.0x` and `2.5x`.
- **Pinch-to-Zoom:** Using `e.touches.length === 2`, calculates Euclidean distance:
  $$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
  Adjusts `zoomScale` relative to distance changes, updating `transform: translate(x, y) scale(s)`.
- **Swipe-to-dismiss:** Detects vertical swipes on `lightboxImg`. Swiping up or down past `100px` calls `closeLightbox()`.
- **Drag-to-dismiss bottom sheet:** Telemetry drawer will have a drag-handle. dragging down past $120\text{px}$ or tapping the close button deselects the planet.

---

## 5. Verification Plan

### Manual Verification Steps
1. **Chrome DevTools Device Simulation:** Check responsiveness on pixel devices (iPhone 12, SE, Pixel 5, iPad) down to $320\text{px}$ width.
2. **Layout Integrity:** Ensure no clipping, overlaps, or overflows in the mobile topbar or settings drawer.
3. **Controls Sync:** Change Sim Speed on desktop controls, resize window to mobile, open settings drawer, and confirm mobile slider shows the same speed multiplier.
4. **Touch Interactions:** Simulating touch events:
   - Drag left half of screen to test dynamic Left Panning Joystick.
   - Drag right half of screen to test right Rotating Camera Joystick.
   - Tap planet cards in the bottom carousel to ensure selected focus functions.
   - Verify double-tap and pinch-to-zoom on Infographic Lightbox.
