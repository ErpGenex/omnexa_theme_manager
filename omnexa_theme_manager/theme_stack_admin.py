# Copyright (c) 2026, Omnexa and contributors
# License: MIT. See license.txt

"""Desk theme stack: runtime toggle (site_config) + install/remove theme app (site-level)."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint

THEME_RUNTIME_APP = "erpgenex_theme_0426"
MANAGER_APP = "omnexa_theme_manager"


def _is_system_manager() -> bool:
	return bool(frappe.get_roles() and "System Manager" in frappe.get_roles())


def _assert_system_manager() -> None:
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.PermissionError, title=_("Theme"))
	frappe.only_for("System Manager")


def _apps_that_require(app_name: str) -> list[str]:
	"""Installed apps that list `app_name` in hooks.required_apps (same rule as frappe.installer.remove_app)."""
	out: list[str] = []
	for app in frappe.get_installed_apps():
		if app == app_name:
			continue
		try:
			hooks = frappe.get_hooks(app_name=app)
		except Exception:
			continue
		reqs = hooks.get("required_apps") or []
		if reqs and any(app_name in (required_app or "") for required_app in reqs):
			out.append(app)
	return out


def _desk_runtime_flag_from_conf() -> int:
	# disable_omnexa_desk_theme = 1 → runtime off; 0 / missing → on
	return 0 if cint(frappe.conf.get("disable_omnexa_desk_theme")) else 1


def _status_dict_full() -> dict:
	installed = frappe.get_installed_apps()
	theme_ok = THEME_RUNTIME_APP in installed
	manager_ok = MANAGER_APP in installed
	try:
		on_bench = THEME_RUNTIME_APP in frappe.get_all_apps()
	except Exception:
		on_bench = False
	return {
		"ok": True,
		"can_manage_stack": True,
		"desk_theme_runtime_enabled": _desk_runtime_flag_from_conf(),
		"theme_runtime_app": THEME_RUNTIME_APP,
		"manager_app": MANAGER_APP,
		"theme_app_installed": theme_ok,
		"manager_app_installed": manager_ok,
		"theme_app_on_bench": on_bench,
		"apps_blocking_theme_removal": _apps_that_require(THEME_RUNTIME_APP),
	}


@frappe.whitelist(methods=["GET", "POST"])
@rate_limit(limit=60, seconds=60, methods=["GET", "POST"])
def get_theme_stack_status():
	"""Return desk theme runtime state; full install details for System Manager only."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.PermissionError, title=_("Theme"))

	if not _is_system_manager():
		return {
			"ok": True,
			"can_manage_stack": False,
			"desk_theme_runtime_enabled": _desk_runtime_flag_from_conf(),
		}
	return _status_dict_full()


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=20, seconds=60, methods=["POST"])
def set_desk_theme_runtime_enabled(enabled: int | None = None):
	"""Enable (1) or disable (0) ERPGenEx desk theme assets via site_config disable_omnexa_desk_theme."""
	_assert_system_manager()
	from frappe.installer import update_site_config

	en = cint(enabled)
	if en and THEME_RUNTIME_APP not in frappe.get_installed_apps():
		frappe.throw(
			_("Cannot enable runtime theme: app {0} is not installed on this site.").format(THEME_RUNTIME_APP),
			title=_("Theme"),
		)
	# enabled=1 → disable_omnexa_desk_theme 0 ; enabled=0 → 1
	update_site_config("disable_omnexa_desk_theme", 0 if en else 1)
	frappe.clear_cache()
	return _status_dict_full()


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=10, seconds=120, methods=["POST"])
def install_theme_runtime_app():
	"""Install app erpgenex_theme_0426 on this site (must exist on bench)."""
	_assert_system_manager()
	from frappe.installer import install_app

	if THEME_RUNTIME_APP in frappe.get_installed_apps():
		return dict(already_installed=True, **_status_dict_full())

	if THEME_RUNTIME_APP not in frappe.get_all_apps():
		frappe.throw(
			_("App {0} is not available on this bench. Add it under apps/ and apps.txt, then try again.").format(
				THEME_RUNTIME_APP
			),
			title=_("Theme"),
		)

	install_app(THEME_RUNTIME_APP, verbose=False)
	frappe.clear_cache()
	return dict(already_installed=False, **_status_dict_full())


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=5, seconds=300, methods=["POST"])
def remove_theme_runtime_app():
	"""Uninstall erpgenex_theme_0426 from this site (blocked if other apps require it)."""
	_assert_system_manager()
	from frappe.installer import remove_app

	blockers = _apps_that_require(THEME_RUNTIME_APP)
	if blockers:
		frappe.throw(
			_("Cannot uninstall {0}: required by {1}. Remove those apps from the site first.").format(
				THEME_RUNTIME_APP,
				", ".join(blockers),
			),
			title=_("Theme"),
		)

	if THEME_RUNTIME_APP not in frappe.get_installed_apps():
		return dict(already_removed=True, **_status_dict_full())
	if _desk_runtime_flag_from_conf():
		frappe.throw(
			_("Disable desk theme runtime first, then remove the runtime app."),
			title=_("Theme"),
		)

	remove_app(THEME_RUNTIME_APP, yes=True, no_backup=False)
	frappe.clear_cache()
	return dict(already_removed=False, **_status_dict_full())


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=3, seconds=600, methods=["POST"])
def uninstall_theme_manager_app(confirmation_phrase: str | None = None):
	"""Uninstall omnexa_theme_manager from this site. Type the exact confirmation phrase."""
	_assert_system_manager()
	from frappe.installer import remove_app

	expected = "UNINSTALL OMNEXA THEME MANAGER"
	if (confirmation_phrase or "").strip() != expected:
		frappe.throw(
			_("To confirm, type exactly: {0}").format(expected),
			title=_("Theme"),
		)

	if MANAGER_APP not in frappe.get_installed_apps():
		return dict(already_removed=True, **_status_dict_full())

	remove_app(MANAGER_APP, yes=True, no_backup=False)
	frappe.clear_cache()
	return {"ok": True, "uninstalled": True}
