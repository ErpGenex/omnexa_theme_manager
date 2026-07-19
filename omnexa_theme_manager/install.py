# Copyright (c) 2026, Omnexa and contributors
# License: MIT. See license.txt

from __future__ import annotations

import json
import os

import frappe

SUPPORTED_FRAPPE_MAJOR = 15

_WORKSPACE_NAME = "Theme Manager"


def enforce_supported_frappe_version():
	"""Fail fast when running on unsupported Frappe major versions."""
	version_text = (getattr(frappe, "__version__", "") or "").strip()
	if not version_text:
		return

	major_token = version_text.split(".", 1)[0]
	try:
		major = int(major_token)
	except ValueError:
		return

	if major != SUPPORTED_FRAPPE_MAJOR:
		frappe.throw(
			f"Unsupported Frappe version '{version_text}' for omnexa_theme_manager. "
			"Supported range is >=15.0,<16.0.",
			frappe.ValidationError,
		)


def _workspace_json_path() -> str:
	return os.path.join(
		frappe.get_app_path("omnexa_theme_manager"),
		"workspace",
		"theme_manager",
		"theme_manager.json",
	)


def _load_workspace_dict() -> dict | None:
	path = _workspace_json_path()
	if not os.path.isfile(path):
		frappe.log_error(f"Theme Manager: missing workspace file at {path}", "Theme Manager Install")
		return None
	with open(path, encoding="utf-8") as f:
		return json.load(f)


def _strip_meta(data: dict) -> dict:
	skip = {
		"doctype",
		"owner",
		"creation",
		"modified",
		"modified_by",
		"docstatus",
		"idx",
		"__islocal",
		"__unsaved",
	}
	return {k: v for k, v in data.items() if k not in skip}


def sync_theme_manager_workspace() -> None:
	"""Create or update the Theme Manager workspace (links + shortcuts from JSON)."""
	if not frappe.db.exists("DocType", "Experience Tenant Theme"):
		return

	raw = _load_workspace_dict()
	if not raw:
		return

	payload = _strip_meta(raw)
	name = payload.get("name") or _WORKSPACE_NAME

	if frappe.db.exists("Workspace", name):
		doc = frappe.get_doc("Workspace", name)
		doc.update(payload)
		doc.save(ignore_permissions=True)
		return

	doc = frappe.get_doc({"doctype": "Workspace", **payload})
	doc.insert(ignore_permissions=True)


def after_install():
	sync_theme_manager_workspace()


def after_migrate():
	sync_theme_manager_workspace()
