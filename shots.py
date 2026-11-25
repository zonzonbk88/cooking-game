"""Take Sizzle & Serve screenshots with headless Chromium (Playwright).

Usage: python3 shots.py [shot ...]
Writes screenshots/<n>-<shot>.png (1280x720) and prints console errors.
"""
import sys, os, subprocess, time, signal
from pathlib import Path

ROOT = Path.home() / "workspace/makefun/builds/cooking-game"
SHOTS = ["cover", "play", "rush"]
PORT = 8091

def main():
    names = sys.argv[1:] or SHOTS
    server = subprocess.Popen(
        ["node", "serve.ts", str(PORT)], cwd=ROOT,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.path.expanduser(
                "~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome"),
                args=["--no-sandbox"])
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type in ("error",) else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            for i, name in enumerate(names, 1):
                page.goto(f"http://localhost:{PORT}/?shot={name}&seed=7")
                page.wait_for_timeout(1200)
                out = ROOT / "screenshots" / f"{i}-{name}.png"
                page.screenshot(path=str(out))
                print(f"{out.name}: {out.stat().st_size} bytes")
            # Also the plain title screen (no ?shot) as a 4th frame.
            page.goto(f"http://localhost:{PORT}/")
            page.wait_for_timeout(800)
            out = ROOT / "screenshots" / "4-title.png"
            page.screenshot(path=str(out))
            print(f"{out.name}: {out.stat().st_size} bytes")
            print("console errors:", errors if errors else "none")
            browser.close()
    finally:
        server.send_signal(signal.SIGTERM)

if __name__ == "__main__":
    main()
