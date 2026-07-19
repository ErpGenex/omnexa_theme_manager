# Copyright (c) 2026, Omnexa and contributors
# License: MIT. See license.txt

from __future__ import annotations

THEME_PRESETS: dict[str, dict[str, str]] = {
	"erpgenex_theme_0426": {
		"label": "ERPGenEx Theme 0426",
		"primary_color": "#2563eb",
		"primary_contrast": "#ffffff",
		"background_color": "#f3f7fb",
		"surface_color": "#ffffff",
		"foreground_color": "#0f172a",
		"font_stack_for_web": '"Inter", "Segoe UI", "Noto Sans Arabic", "Noto Sans", Arial, sans-serif',
		"desk_theme_mode": "light",
		"desk_base_font_size": "16px",
		"desk_ui_density": "comfortable",
		"desk_radius_scale": "soft",
	},
	# Ported from Midocean-Technologies/business_theme_v14
	"business_theme_v14": {
		"label": "Business Theme v14 (ported)",
		"primary_color": "#ffa00a",
		"primary_contrast": "#ffffff",
		"background_color": "#f2f5fa",
		"surface_color": "#ffffff",
		"foreground_color": "#0f172a",
		"font_stack_for_web": '"Inter", "Segoe UI", "Noto Sans Arabic", "Noto Sans", Arial, sans-serif',
		"desk_theme_mode": "light",
		"desk_base_font_size": "16px",
		"desk_ui_density": "comfortable",
		"desk_radius_scale": "classic",
	},
	"global_minimal_light": {
		"label": "Global Minimal Light",
		"primary_color": "#1d4ed8",
		"primary_contrast": "#ffffff",
		"background_color": "#f8fafc",
		"surface_color": "#ffffff",
		"foreground_color": "#0f172a",
		"font_stack_for_web": '"Inter", "Segoe UI", "Noto Sans", Arial, sans-serif',
		"desk_theme_mode": "light",
		"desk_base_font_size": "15px",
		"desk_ui_density": "comfortable",
		"desk_radius_scale": "classic",
	},
	"global_midnight_blue": {
		"label": "Global Midnight Blue",
		"primary_color": "#60a5fa",
		"primary_contrast": "#0b1220",
		"background_color": "#0b1220",
		"surface_color": "#111c34",
		"foreground_color": "#e5edf7",
		"font_stack_for_web": '"Inter", "Segoe UI", "Noto Sans", Arial, sans-serif',
		"desk_theme_mode": "dark",
		"desk_base_font_size": "16px",
		"desk_ui_density": "comfortable",
		"desk_radius_scale": "soft",
	},
}


def get_theme_preset(name: str | None) -> dict[str, str]:
	return dict(THEME_PRESETS.get(name or "erpgenex_theme_0426") or THEME_PRESETS["erpgenex_theme_0426"])
