import os
import sys
import time

def run_tests():
    print("=== STARTING RESPONSIVE HUD E2E TESTS ===")
    
    # 1. Initialize tab and load local host
    tabs = list_tabs()
    target_tab = next((t for t in tabs if "127.0.0.1:8080" in t["url"] or "localhost:8080" in t["url"]), None)
    if target_tab:
        print(f"Reusing existing tab: {target_tab['title']} ({target_tab['targetId']})")
        switch_tab(target_tab["targetId"])
        js("location.reload()")
    else:
        print("Opening new tab for http://127.0.0.1:8080")
        new_tab("http://127.0.0.1:8080")
    wait_for_load()
    
    info = page_info()
    print(f"Page loaded: {info['title']}")
    
    # 2. Resize to mobile viewport (iPhone 12 / 13 Pro size: 390 x 844)
    print("Emulating mobile viewport...")
    cdp("Emulation.setDeviceMetricsOverride",
        width=390,
        height=844,
        deviceScaleFactor=3,
        mobile=True
    )
    wait(0.5)
    js("location.reload()")
    wait_for_load()
    wait(1.5)
    
    # Take initial screenshot
    screenshot_dir = r"C:\Users\SpaceCat\.gemini\antigravity\brain\eb9f79e1-4a46-4cc1-b2f3-a6da0f35b843"
    capture_screenshot(os.path.join(screenshot_dir, "01_mobile_home.png"))
    print("Captured initial mobile home screenshot.")
    
    # 3. Assert Mobile menu toggle is visible in mobile view
    is_toggle_visible = js("document.getElementById('mobile-menu-toggle').getBoundingClientRect().width > 0")
    print(f"Mobile Menu Toggle Visible: {is_toggle_visible}")
    if not is_toggle_visible:
        print("FAIL: Mobile menu toggle should be visible on small viewports!")
        sys.exit(1)
        
    # 4. Click mobile menu toggle to open HUD controls drawer
    print("Opening Mobile Settings Drawer...")
    js("document.getElementById('mobile-menu-toggle').click()")
    wait(1.0)
    
    capture_screenshot(os.path.join(screenshot_dir, "02_mobile_drawer_open.png"))
    is_drawer_open = js("document.getElementById('mobile-settings-drawer').classList.contains('open')")
    print(f"Mobile Settings Drawer Open: {is_drawer_open}")
    if not is_drawer_open:
        print("FAIL: Settings drawer did not open!")
        sys.exit(1)
        
    # 5. Synchronized state testing: Toggle Orbits in Mobile Drawer
    print("Toggling Orbits off in Mobile Drawer...")
    js("document.getElementById('mobile-toggle-orbits-btn').click()")
    wait(0.5)
    
    orbits_mode = js("document.getElementById('mobile-toggle-orbits-btn').textContent.trim()")
    desktop_orbits_mode = js("document.getElementById('toggle-orbits-btn').textContent.trim()")
    print(f"Mobile orbits label: {orbits_mode}, Desktop orbits label: {desktop_orbits_mode}")
    if orbits_mode != "Muted" or desktop_orbits_mode != "Muted":
        print("FAIL: Orbits sync or toggle failed!")
        sys.exit(1)
        
    # Close mobile drawer
    print("Closing Mobile Settings Drawer...")
    js("document.getElementById('mobile-drawer-close').click()")
    wait(1.0)
    
    is_drawer_open = js("document.getElementById('mobile-settings-drawer').classList.contains('open')")
    print(f"Mobile Settings Drawer Open: {is_drawer_open}")
    
    # 6. Click bottom carousel card to select MARS
    print("Selecting Mars from Bottom Carousel...")
    js("Array.from(document.querySelectorAll('.mobile-carousel-card')).find(c => c.querySelector('.carousel-planet-name').textContent.toUpperCase() === 'MARS').click()")
    wait(2.0)
    
    capture_screenshot(os.path.join(screenshot_dir, "03_mobile_mars_details.png"))
    is_details_open = js("document.getElementById('telemetry-panel').classList.contains('open')")
    print(f"Mars Details Panel Open: {is_details_open}")
    if not is_details_open:
        print("FAIL: Details telemetry panel did not slide up!")
        sys.exit(1)
        
    # 7. Click telemetry infographic to open Lightbox
    print("Opening Infographic Lightbox...")
    js("document.getElementById('planet-infographic-img').click()")
    wait(1.5)
    
    capture_screenshot(os.path.join(screenshot_dir, "04_mobile_lightbox_open.png"))
    is_lightbox_open = js("document.getElementById('infographic-lightbox').classList.contains('open')")
    print(f"Lightbox open state: {is_lightbox_open}")
    if not is_lightbox_open:
        print("FAIL: Lightbox did not open!")
        sys.exit(1)
        
    # 8. Test double-tap zoom gesture in Lightbox via synthetic Touch events
    print("Simulating double-tap zoom touch event on Lightbox Image...")
    # Trigger first touchstart / touchend
    js("""{
        const img = document.getElementById('lightbox-img');
        const t1 = new Touch({ identifier: 10, target: img, clientX: 195, clientY: 422 });
        img.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t1], touches: [t1] }));
        img.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t1], touches: [] }));
    }""")
    wait(0.1)
    # Trigger second touchstart / touchend within 150ms
    js("""{
        const img = document.getElementById('lightbox-img');
        const t2 = new Touch({ identifier: 11, target: img, clientX: 195, clientY: 422 });
        img.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t2], touches: [t2] }));
        img.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t2], touches: [] }));
    }""")
    wait(1.0)
    
    lightbox_zoom = js("window.app.zoomScale")
    print(f"Lightbox zoom scale after double-tap: {lightbox_zoom}")
    capture_screenshot(os.path.join(screenshot_dir, "05_mobile_lightbox_zoomed.png"))
    if lightbox_zoom <= 1.0:
        print("FAIL: Double-tap did not zoom the lightbox!")
        sys.exit(1)
        
    # Double-tap again to zoom out
    print("Simulating second double-tap to zoom out...")
    js("""{
        const img = document.getElementById('lightbox-img');
        const t3 = new Touch({ identifier: 12, target: img, clientX: 195, clientY: 422 });
        img.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t3], touches: [t3] }));
        img.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t3], touches: [] }));
    }""")
    wait(0.1)
    js("""{
        const img = document.getElementById('lightbox-img');
        const t4 = new Touch({ identifier: 13, target: img, clientX: 195, clientY: 422 });
        img.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [t4], touches: [t4] }));
        img.dispatchEvent(new TouchEvent('touchend', { changedTouches: [t4], touches: [] }));
    }""")
    wait(1.0)
    lightbox_zoom = js("window.app.zoomScale")
    print(f"Lightbox zoom scale after double-tap zoom out: {lightbox_zoom}")
    if lightbox_zoom != 1.0:
        print("FAIL: Second double-tap did not zoom out!")
        sys.exit(1)
        
    # 9. Test swipe-to-dismiss in Lightbox
    print("Simulating vertical swipe-down touch gesture to dismiss Lightbox...")
    js("""{
        const img = document.getElementById('lightbox-img');
        const tStart = new Touch({ identifier: 20, target: img, clientX: 195, clientY: 200 });
        const tMove = new Touch({ identifier: 20, target: img, clientX: 195, clientY: 350 });
        img.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [tStart], touches: [tStart] }));
        img.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [tMove], touches: [tMove] }));
        img.dispatchEvent(new TouchEvent('touchend', { changedTouches: [tMove], touches: [] }));
    }""")
    wait(1.0)
    
    is_lightbox_open = js("document.getElementById('infographic-lightbox').classList.contains('open')")
    print(f"Lightbox open state after swipe-dismiss: {is_lightbox_open}")
    if is_lightbox_open:
        print("FAIL: Swipe down did not dismiss lightbox!")
        sys.exit(1)
        
    # 10. Verify virtual joysticks activation (Left & Right)
    print("Simulating touchstart on left side of screen to activate Left Panning Joystick...")
    js("""{
        const startTouch = new Touch({ identifier: 30, target: document.body, clientX: 80, clientY: 400 });
        window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [startTouch], touches: [startTouch] }));
    }""")
    wait(0.5)
    
    left_active = js("window.app.leftJoystickActive")
    left_opacity = js("document.getElementById('joystick-left').style.opacity")
    print(f"Left Joystick Active: {left_active}, Left Joystick opacity: {left_opacity}")
    capture_screenshot(os.path.join(screenshot_dir, "06_left_joystick_activated.png"))
    
    # Release left joystick
    js("""{
        const endTouch = new Touch({ identifier: 30, target: document.body, clientX: 80, clientY: 400 });
        window.dispatchEvent(new TouchEvent('touchend', { changedTouches: [endTouch], touches: [] }));
    }""")
    wait(0.5)
    
    left_active = js("window.app.leftJoystickActive")
    print(f"Left Joystick Active after release: {left_active}")
    if left_active:
        print("FAIL: Left Joystick did not release successfully!")
        sys.exit(1)
        
    print("Simulating touchstart and touchmove on right side of screen to activate Right Camera Joystick...")
    js("""{
        const startTouch = new Touch({ identifier: 40, target: document.body, clientX: 300, clientY: 400 });
        const moveTouch = new Touch({ identifier: 40, target: document.body, clientX: 330, clientY: 380 });
        window.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [startTouch], touches: [startTouch] }));
        window.dispatchEvent(new TouchEvent('touchmove', { changedTouches: [moveTouch], touches: [moveTouch] }));
    }""")
    wait(0.5)
    
    right_active = js("window.app.rightJoystickActive")
    right_opacity = js("document.getElementById('joystick-right').style.opacity")
    print(f"Right Joystick Active: {right_active}, Right Joystick opacity: {right_opacity}")
    
    # Wait to let the animation loop process right joystick inputs and rotate the camera
    wait(0.5)
    
    # Release right joystick
    js("""{
        const endTouch = new Touch({ identifier: 40, target: document.body, clientX: 330, clientY: 380 });
        window.dispatchEvent(new TouchEvent('touchend', { changedTouches: [endTouch], touches: [] }));
    }""")
    wait(0.5)
    
    right_active = js("window.app.rightJoystickActive")
    print(f"Right Joystick Active after release: {right_active}")
    if right_active:
        print("FAIL: Right Joystick did not release successfully!")
        sys.exit(1)

    print("=== ALL RESPONSIVE HUD E2E TESTS PASSED SUCCESSFULLY! ===")

run_tests()
