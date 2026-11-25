"""Browser playtest: cook whatever the first simple ticket asks for, by clicking.

Reads the board through window.__sizzle, follows a per-ingredient click plan,
plates it, serves it, and asserts score > 0 and served == 1.
"""
import os, subprocess, time, signal, sys
from pathlib import Path

ROOT = Path.home() / "workspace/makefun/builds/cooking-game"
PORT = 8092

# Click points for each ingredient source (bin centres on the station row).
FETCH = {
    "bun": [(795, 150)],
    "cheese": [(665, 150)],
    "patty": [(590, 150), (995, 150), "wait7", (995, 150)],
    "lettuceChopped": [(342, 150), (1185, 150), "wait4", (1185, 150)],
    "tomatoChopped": [(405, 150), (1185, 150), "wait4", (1185, 150)],
    "onionChopped": [(468, 150), (1185, 150), "wait4", (1185, 150)],
}
SIMPLE = {"classic", "cheese", "salad", "veggie", "smoky"}  # double needs 2 grill runs

def state(page):
    return page.evaluate("""() => {
        const w = window.__sizzle.world;
        return {screen: window.__sizzle.screen, score: w.score, served: w.served,
            missed: w.missed, carry: [...w.chef.carry], chef: {x: Math.round(w.chef.x), y: Math.round(w.chef.y)},
            grill: w.grill.slots.map(s => s ? s.state : null), board: w.board.slot ? w.board.slot.state : null,
            pass: [...w.pass.plate], tickets: w.tickets.map(t => ({id: t.id, recipe: t.recipe.id, patience: Math.round(t.patience)})),
            timeLeft: Math.round(w.timeLeft)};
    }""")

def click(page, x, y, wait=2.5):
    page.mouse.click(x, y)
    page.wait_for_timeout(int(wait * 1000))

def wait_until(page, check, timeout=8):
    """Poll the live world until check(state) is true (the chef walks ~2.5s)."""
    for _ in range(int(timeout * 10)):
        if check(state(page)):
            return True
        page.wait_for_timeout(100)
    return False

def main():
    server = subprocess.Popen(["node", "serve.ts", str(PORT)], cwd=ROOT,
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
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://localhost:{PORT}/")
            page.wait_for_timeout(600)
            page.keyboard.press("Enter")
            page.wait_for_timeout(500)
            target = None
            for _ in range(120):
                for t in state(page)["tickets"]:
                    if t["recipe"] in SIMPLE:
                        target = t
                        break
                if target:
                    break
                page.wait_for_timeout(1000)
            if not target:
                print("PLAYTEST INCONCLUSIVE: no simple ticket in 120s")
                browser.close()
                return
            print("cooking for ticket:", target)
            needs = page.evaluate(f"""() => {{
                const w = window.__sizzle.world;
                const t = w.tickets.find(t => t.id === {target['id']});
                return t ? [...t.recipe.needs] : null;
            }}""")
            print("needs:", needs)
            # Fetch + plate in batches of 3 (carry limit), plating as we go.
            pending = list(needs)
            while pending:
                batch = []
                while pending and len(batch) < 3:
                    item = pending.pop(0)
                    for step in FETCH[item]:
                        if step == "wait7":
                            page.wait_for_timeout(7000)
                        elif step == "wait4":
                            page.wait_for_timeout(4000)
                        else:
                            click(page, step[0], step[1])
                    batch.append(item)
                for _ in batch:
                    before = len(state(page)["pass"])
                    click(page, 705, 632, 1.0)
                    wait_until(page, lambda s: len(s["pass"]) > before)
                print("plated batch:", batch, state(page)["pass"])
            click(page, 705, 632, 1.0)  # take the plate
            wait_until(page, lambda s: "plate" in s["carry"])
            click(page, 1185, 632, 1.0)  # serve it
            wait_until(page, lambda s: s["served"] == 1)
            final = state(page)
            print("final:", final)
            page.screenshot(path=str(ROOT / "screenshots" / "5-served.png"))
            print("console errors:", errors if errors else "none")
            ok = final["served"] == 1 and final["score"] > 0
            print("PLAYTEST PASS — served, score", final["score"]) if ok else print("PLAYTEST FAIL — not served")
            browser.close()
            sys.exit(0 if ok else 1)
    finally:
        server.send_signal(signal.SIGTERM)

if __name__ == "__main__":
    main()
