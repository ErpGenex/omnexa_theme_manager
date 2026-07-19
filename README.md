# Omnexa Theme Manager

**Free / MIT** — small Frappe app that adds a **Theme Manager** desk workspace so administrators can open, edit, and publish **Experience Tenant Theme** records (company colours, desk typography, presets) used by **ERPGenEx** (`omnexa_experience`).

## What it does

- Installs a public desk workspace **Theme Manager** with shortcuts to:
  - List / new **Experience Tenant Theme**
  - Quick notes on **toolbar Theme button** and **Alt+Shift+T** (runtime from app **`erpgenex_theme_0426`**)
- Desk visuals ship in **`erpgenex_theme_0426`**; this app adds workspace + API overrides + tenant tooling.

## Requirements

- `frappe`
- `omnexa_experience` (provides `Experience Tenant Theme` and base desk theme hooks)
- `erpgenex_theme_0426` (ERPGenEx Desk CSS/JS bundle; required automatically)

## Install

From the bench directory (after copying or cloning the app under `apps/omnexa_theme_manager`):

```bash
# 1) Register the Python package (needed for bench import + build)
./env/bin/pip install -e ./apps/omnexa_theme_manager

# 2) Register the app name for asset linking (esbuild reads sites/apps.txt)
echo omnexa_theme_manager >> sites/apps.txt   # skip if already present

# 3) Install on the site (pulls in omnexa_experience if needed)
bench --site <yoursite> install-app omnexa_theme_manager

# 4) Build / link assets
bench build --app omnexa_theme_manager
```

After install, open desk workspace **Theme Manager** (sidebar) for shortcuts to **Experience Tenant Theme** (company/desk/web theme records). Personal desk tweaks stay in **omnexa_experience** (toolbar **Theme** / **Alt+Shift+T**).

`bench get-app` from a folder usually expects a git repo; if you only have a plain folder, use `pip install -e` + `apps.txt` as above.

## Uninstall

```bash
bench --site <site> uninstall-app omnexa_theme_manager
```

## License

MIT — see `license.txt`.
