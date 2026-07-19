from __future__ import annotations

import frappe


@frappe.whitelist()
def preview_infra_kpi(scenario: str | None = None, params: str | None = None) -> dict:
	from omnexa_core.omnexa_core.parity_api import preview_infra_kpi as _p
	return _p("theme_manager", scenario=scenario, params=params)
