# Copyright (c) 2026, Omnexa and contributors
# License: MIT. See license.txt

from __future__ import annotations

import json
from urllib.parse import unquote, urlparse

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint

from omnexa_theme_manager.theme_presets import THEME_PRESETS, get_theme_preset

_PRESET_TOKEN_FIELD_NAMES = (
	"primary_color",
	"primary_contrast",
	"background_color",
	"surface_color",
	"foreground_color",
	"font_stack_for_web",
	"desk_theme_mode",
	"desk_base_font_size",
	"desk_ui_density",
	"desk_radius_scale",
)


def _assert_theme_manager_admin() -> None:
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.PermissionError, title=_("Theme"))
	frappe.only_for("System Manager")


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=40, seconds=60, methods=["POST"])
def get_json_from_file_url(file_url: str | None = None):
	"""Read a UTF-8 JSON file uploaded to the site (used by Theme Manager upload dialog)."""
	_assert_theme_manager_admin()
	if not (file_url or "").strip():
		frappe.throw(_("Choose a file first."), title=_("Theme"))
	url = unquote(file_url.strip())
	if url.startswith("http://") or url.startswith("https://"):
		url = urlparse(url).path or url
	name = frappe.db.get_value("File", {"file_url": url
	}, "name")
	if not name:
		frappe.throw(_("Uploaded file was not found. Try attaching again."), title=_("Theme"))
	doc = frappe.get_doc("File", name)
	raw = doc.get_content()
	try:
		text = raw.decode("utf-8")
	except UnicodeDecodeError:
		frappe.throw(_("File must be UTF-8 text."), title=_("Theme"))
	try:
		data = json.loads(text)
	except json.JSONDecodeError:
		frappe.throw(_("Invalid JSON in file."), title=_("Theme"))
	if not isinstance(data, dict):
		frappe.throw(_("JSON root must be an object."), title=_("Theme"))
	return data


def _get_user_company() -> str | None:
	user = frappe.session.user
	if not user or user == "Guest":
		return None
	try:
		co = frappe.defaults.get_user_default("Company", user=user)
	except Exception:
		# Setup Wizard can run before some defaults doctypes are ready.
		co = None
	if co:
		return co
	# Many users never set Session Default; fall back to site default company.
	try:
		gc = frappe.db.get_single_value("Global Defaults", "default_company")
	except Exception:
		gc = None
	return gc or None


def _active_desk_theme_row(company: str | None) -> dict | None:
	if not frappe.db.table_exists("Experience Tenant Theme"):
		return None
	filters = ["where ifnull(apply_to_desk, 0) = 1"]
	values: dict[str, str] = {}
	if company:
		filters.append("and company = %(company)s")
		values["company"] = company
	rows = frappe.db.sql(
		f"""
		select name, company, modified, theme_preset, primary_color, primary_contrast, background_color,
			surface_color, foreground_color, font_stack_for_web, desk_theme_mode,
			desk_base_font_size, desk_ui_density, desk_radius_scale, logo, logo_url
		from `tabExperience Tenant Theme`
		{' '.join(filters)}
		order by modified desc
		limit 1
		""",
		values,
		as_dict=True,
	)
	return rows[0] if rows else None


def _theme_row_by_name(name: str | None) -> dict | None:
	if not name or not frappe.db.table_exists("Experience Tenant Theme"):
		return None
	if not frappe.db.exists("Experience Tenant Theme", name):
		return None
	rows = frappe.db.sql(
		"""
		select name, company, modified, theme_preset, primary_color, primary_contrast, background_color,
			surface_color, foreground_color, font_stack_for_web, desk_theme_mode,
			desk_base_font_size, desk_ui_density, desk_radius_scale, logo, logo_url
		from `tabExperience Tenant Theme`
		where name = %(name)s
		""",
		{"name": name
	},
		as_dict=True,
	)
	return rows[0] if rows else None


def _compose_payload(row: dict | None) -> dict:
	preset_name = (row or {}).get("theme_preset") or "erpgenex_theme_0426"
	preset = get_theme_preset(preset_name)
	payload = {
		"preset": preset_name,
		"preset_label": preset.get("label", preset_name),
		"tokens": {
			"primary_color": (row or {
	}).get("primary_color") or preset["primary_color"],
			"primary_contrast": (row or {
	}).get("primary_contrast") or preset["primary_contrast"],
			"background_color": (row or {
	}).get("background_color") or preset["background_color"],
			"surface_color": (row or {
	}).get("surface_color") or preset["surface_color"],
			"foreground_color": (row or {
	}).get("foreground_color") or preset["foreground_color"],
			"font_stack_for_web": (row or {
	}).get("font_stack_for_web") or preset["font_stack_for_web"],
			"desk_theme_mode": (row or {
	}).get("desk_theme_mode") or preset["desk_theme_mode"],
			"desk_base_font_size": (row or {
	}).get("desk_base_font_size") or preset["desk_base_font_size"],
			"desk_ui_density": (row or {
	}).get("desk_ui_density") or preset["desk_ui_density"],
			"desk_radius_scale": (row or {
	}).get("desk_radius_scale") or preset["desk_radius_scale"],
			"logo_url": (row or {}).get("logo") or (row or {}).get("logo_url") or ""}
	}
	if row:
		payload["theme"] = row.get("name")
		payload["company"] = row.get("company")
		# Client uses this to drop stale browser overrides when the active desk theme row changes.
		mod = row.get("modified")
		payload["desk_theme_revision"] = f"{row.get('name')}:{mod}" if mod else (row.get("name") or "")
	else:
		payload["desk_theme_revision"] = "fallback:defaults"
	return payload


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=120, seconds=60, methods=["POST"])
def get_theme_preset_tokens(preset: str | None = None):
	"""Return token fields for a named preset (form: fill colours + live desk preview)."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.PermissionError, title=_("Theme"))
	p = get_theme_preset(preset)
	tokens = {k: p[k] for k in _PRESET_TOKEN_FIELD_NAMES if k in p}
	return {"ok": True, "preset_label": p.get("label", ""), "tokens": tokens
	}


# Desk calls this via frappe.call, which defaults to POST. GET-only whitelists raise "Not permitted".
@frappe.whitelist(methods=["GET", "POST"])
@rate_limit(limit=120, seconds=60, methods=["GET", "POST"])
def get_desk_theme_payload(company: str | None = None, prefer_theme: str | None = None):
	"""Return active company desk theme, falling back to ERPGenEx Theme 0426.

	:param company: Optional company to resolve the active row (use the theme document's company after save/activate
		when it differs from the user's Session Default company).
	:param prefer_theme: Optional Experience Tenant Theme name; if that row has Apply to Desk, return it first
		(strongest match right after saving the same document).
	"""
	user_company = _get_user_company()
	co_filter = (company or "").strip()
	lookup_company = co_filter or user_company

	row = None
	pt = (prefer_theme or "").strip()
	if pt:
		cand = _theme_row_by_name(pt)
		if cand and cint(cand.get("apply_to_desk")):
			if not co_filter or cand.get("company") == co_filter:
				row = cand

	if row is None:
		row = _active_desk_theme_row(lookup_company) or _active_desk_theme_row(None)

	out = {
		"ok": True,
		"theme": _compose_payload(row),
		"presets": THEME_PRESETS,
		"default_preset": "erpgenex_theme_0426",
		"user_company": user_company
	}
	if row:
		out["active_theme_company"] = row.get("company")
	return out


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=60, seconds=60, methods=["POST"])
def get_theme_studio_defaults():
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required."), frappe.PermissionError, title=_("Theme"))
	return get_desk_theme_payload()
