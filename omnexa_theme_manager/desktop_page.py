# Copyright (c) 2026, Omnexa and contributors
# License: MIT. See license.txt

"""Enforce System Manager (or Workspace Manager) for the Theme Manager workspace.

Frappe's default `get_desktop_page` does not apply Workspace role rows; this override
adds that check for the Theme Manager page only. Keep in sync with
`frappe.desk.desktop.get_desktop_page`.
"""

from __future__ import annotations

from json import loads

import frappe
from frappe import DoesNotExistError, _
from frappe.desk.desktop import Workspace


@frappe.whitelist()
@frappe.read_only()
def get_desktop_page(page):
	try:
		payload = loads(page)
	except Exception:
		payload = {}

	if payload.get("name") == "Theme Manager":
		roles = frappe.get_roles()
		if "System Manager" not in roles and "Workspace Manager" not in roles:
			frappe.throw(_("Not permitted"), frappe.PermissionError, title=_("Theme Manager"))

	try:
		workspace = Workspace(payload)
		workspace.build_workspace()
		return {
			"charts": workspace.charts,
			"shortcuts": workspace.shortcuts,
			"cards": workspace.cards,
			"onboardings": workspace.onboardings,
			"quick_lists": workspace.quick_lists,
			"number_cards": workspace.number_cards,
			"custom_blocks": workspace.custom_blocks,
		}
	except DoesNotExistError:
		frappe.log_error("Workspace Missing")
		return {}
