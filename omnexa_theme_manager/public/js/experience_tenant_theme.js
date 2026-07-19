// Copyright (c) 2026, Omnexa and contributors
// License: MIT. See license.txt

(function () {
	"use strict";

	const PY = "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme";
	const PRESET_GROUP = __("Public website");
	const TOOLS_GROUP = __("Tools");
	const TOKEN_FIELDS = [
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
	];

	let deskPreviewTimer = null;

	if (!window._omnexa_ett_route_patch) {
		window._omnexa_ett_route_patch = true;
		const _orig_set_route = frappe.router.set_route;
		frappe.router.set_route = function (...args) {
			document.body.classList.remove("omnexa-experience-tenant-theme-page");
			return _orig_set_route.apply(frappe.router, args);
		};
	}

	function markEttPage() {
		document.body.classList.add("omnexa-experience-tenant-theme-page");
	}

	function waitForDeskThemeRuntime(timeoutMs) {
		const deadline = Date.now() + (timeoutMs || 12000);
		return new Promise((resolve) => {
			function tick() {
				if (
					window.erpgenexTheme0426 &&
					typeof window.erpgenexTheme0426.refreshFromServer === "function"
				) {
					resolve(true);
					return;
				}
				if (Date.now() > deadline) {
					resolve(false);
					return;
				}
				setTimeout(tick, 80);
			}
			tick();
		});
	}

	/** Match server payload to the row just saved (session default company can differ from the theme's company). */
	function deskRefreshOpts(frm) {
		return {
			company: frm.doc.company,
			prefer_theme: frm.doc.name,
		};
	}

	/** Same as Theme Manager workspace: site-wide standard Frappe Desk (disables ERPGenEx desk theme). */
	function restoreFrappeDefaultDeskSiteWide() {
		if (frappe.theme_manager && typeof frappe.theme_manager.restore_frappe_default_desk === "function") {
			frappe.theme_manager.restore_frappe_default_desk();
			return;
		}
		frappe.confirm(
			__(
				"This sets the site to use the standard Frappe Desk (disables the ERPGenEx desk theme). All users will see the default Frappe look after reload. Continue?"
			),
			() => {
				frappe.call({
					method: "omnexa_theme_manager.theme_stack_admin.set_desk_theme_runtime_enabled",
					args: { enabled: 0 },
					freeze: true,
					callback() {
						if (
							window.erpgenexTheme0426 &&
							typeof window.erpgenexTheme0426.clearPersonalThemeOverrides === "function"
						) {
							window.erpgenexTheme0426.clearPersonalThemeOverrides();
						}
						frappe.show_alert({
							message: __("Standard Frappe Desk enabled. Reloading…"),
							indicator: "green",
						});
						window.setTimeout(() => window.location.reload(), 450);
					},
				});
			}
		);
	}

	function tryDeskPreview(frm) {
		if (!frm || frm.is_new() || !cint(frm.doc.apply_to_desk)) return;
		if (window.erpgenexTheme0426 && typeof window.erpgenexTheme0426.previewDeskFromDoc === "function") {
			window.erpgenexTheme0426.previewDeskFromDoc(frm.doc);
		}
	}

	function tryDeskPreviewDebounced(frm) {
		if (deskPreviewTimer) clearTimeout(deskPreviewTimer);
		deskPreviewTimer = setTimeout(() => {
			deskPreviewTimer = null;
			tryDeskPreview(frm);
		}, 320);
	}

	/** After server re-enables desk runtime, boot in this tab is stale until reload — erpgenex JS/CSS will not run otherwise. */
	function reloadIfDeskRuntimeWasOff() {
		if (frappe.boot && cint(frappe.boot.omnexa_desk_theme_enabled) === 0) {
			frappe.show_alert({
				message: __("Desk theme runtime was turned on. Reloading the page…"),
				indicator: "green",
			});
			window.setTimeout(() => window.location.reload(), 500);
			return true;
		}
		return false;
	}

	function pullPresetTokensIntoForm(frm, done) {
		if (frm.is_new() || frm._ett_suppress_preset_hook) {
			if (done) done();
			return;
		}
		frappe.call({
			method: "omnexa_theme_manager.desk_theme.get_theme_preset_tokens",
			args: { preset: frm.doc.theme_preset },
			freeze: false,
			callback(r) {
				const tokens = (r.message && r.message.tokens) || {};
				(async () => {
					for (const f of TOKEN_FIELDS) {
						if (tokens[f] == null || tokens[f] === "") continue;
						const p = frm.set_value(f, tokens[f]);
						if (p && typeof p.then === "function") await p;
					}
					if (done) done();
				})().catch(() => {
					if (done) done();
				});
			},
			error() {
				if (done) done();
			},
		});
	}

	frappe.ui.form.on("Experience Tenant Theme", {
		onload(frm) {
			markEttPage();
		},

		after_save(frm) {
			if (frm.is_new()) return;
			if (!frm.doc.apply_to_desk) return;
			if (reloadIfDeskRuntimeWasOff()) return;
			const go = () =>
				waitForDeskThemeRuntime().then((ready) => {
					if (
						ready &&
						window.erpgenexTheme0426 &&
						typeof window.erpgenexTheme0426.clearPersonalThemeOverrides === "function"
					) {
						window.erpgenexTheme0426.clearPersonalThemeOverrides();
					}
					if (
						ready &&
						window.erpgenexTheme0426 &&
						typeof window.erpgenexTheme0426.previewDeskFromDoc === "function"
					) {
						window.erpgenexTheme0426.previewDeskFromDoc(frm.doc);
					}
					if (ready && window.erpgenexTheme0426 && window.erpgenexTheme0426.refreshFromServer) {
						return window.erpgenexTheme0426.refreshFromServer(deskRefreshOpts(frm)).then(() => {
							frappe.show_alert({
								message: __("Desk theme applied in this browser."),
								indicator: "green",
							});
						});
					}
					frappe.show_alert({
						message: __(
							"Theme saved. Reload the page (Ctrl+Shift+R) if the Desk look did not update — the theme script may still be loading."
						),
						indicator: "orange",
					});
					return Promise.resolve();
				});
			go();
		},

		theme_preset(frm) {
			if (frm.is_new() || frm._ett_suppress_preset_hook) return;
			pullPresetTokensIntoForm(frm, () => tryDeskPreview(frm));
		},

		apply_to_desk(frm) {
			if (frm.is_new()) return;
			if (cint(frm.doc.apply_to_desk)) tryDeskPreviewDebounced(frm);
		},

		refresh(frm) {
			markEttPage();
			frm.clear_custom_buttons();

			if (frm.is_new()) {
				frm.set_intro(
					__(
						"Pick a company, choose a preset, then adjust colours. Save with “Apply to Desk” checked, or use “Activate for Desk” after saving."
					),
					"blue"
				);
				return;
			}

			frm.set_intro(
				__(
					"Changing “Theme preset” updates colours and previews the Desk when “Apply to Desk” is checked. Save to persist. Use “Activate for Desk” if another row is active."
				),
				null
			);

			if (frappe.user.has_role("System Manager")) {
				frm.add_custom_button(__("Frappe default desk (whole site)"), () => restoreFrappeDefaultDeskSiteWide());
			}

			frm.add_custom_button(__("Activate for Desk"), () => {
				frappe.confirm(
					__(
						"Set this document as the active Desk theme for its company? Other saved themes stay available."
					),
					() => {
						frappe.call({
							method: `${PY}.activate_desk_theme`,
							args: { theme: frm.doc.name },
							freeze: true,
							callback() {
								if (reloadIfDeskRuntimeWasOff()) return;
								const finish = () => {
									frappe.show_alert({
										message: __("Desk theme activated."),
										indicator: "green",
									});
									frm.reload_doc();
								};
								waitForDeskThemeRuntime().then((ready) => {
									if (
										ready &&
										window.erpgenexTheme0426 &&
										typeof window.erpgenexTheme0426.clearPersonalThemeOverrides === "function"
									) {
										window.erpgenexTheme0426.clearPersonalThemeOverrides();
									}
									if (
										ready &&
										window.erpgenexTheme0426 &&
										typeof window.erpgenexTheme0426.previewDeskFromDoc === "function"
									) {
										window.erpgenexTheme0426.previewDeskFromDoc(frm.doc);
									}
									if (ready && window.erpgenexTheme0426 && window.erpgenexTheme0426.refreshFromServer) {
										window.erpgenexTheme0426
											.refreshFromServer(deskRefreshOpts(frm))
											.then(finish)
											.catch(finish);
									} else {
										finish();
									}
								});
							},
						});
					}
				);
			});

			frm.add_custom_button(__("Apply ERPGenEx 0426 preset"), () => {
				frm._ett_suppress_preset_hook = true;
				const rows = [
					["theme_preset", "erpgenex_theme_0426"],
					["primary_color", "#2563eb"],
					["primary_contrast", "#ffffff"],
					["background_color", "#f3f7fb"],
					["surface_color", "#ffffff"],
					["foreground_color", "#0f172a"],
					[
						"font_stack_for_web",
						'"Inter", "Segoe UI", "Noto Sans Arabic", "Noto Sans", Arial, sans-serif',
					],
					["desk_theme_mode", "light"],
					["desk_base_font_size", "16px"],
					["desk_ui_density", "comfortable"],
					["desk_radius_scale", "soft"],
				];
				(async () => {
					try {
						for (const [f, v] of rows) {
							const p = frm.set_value(f, v);
							if (p && typeof p.then === "function") await p;
						}
					} finally {
						frm._ett_suppress_preset_hook = false;
						tryDeskPreview(frm);
					}
				})();
			});

			frm.add_custom_button(__("Open desk theme studio"), () => {
				if (window.erpgenexTheme0426 && window.erpgenexTheme0426.openStudio) {
					window.erpgenexTheme0426.openStudio();
				} else {
					frappe.show_alert({
						message: __("Theme studio is still loading. Wait a moment or refresh the page."),
						indicator: "orange",
					});
				}
			});

			frm.add_custom_button(
				__("Preview HTML head"),
				async () => {
					const r = await frappe.call({
						method: "omnexa_experience.omnexa_experience.web_theme.preview_theme_head",
						args: { theme: frm.doc.name, company: frm.doc.company },
					});
					const out = r.message || {};
					frappe.msgprint({
						title: __("Theme preview"),
						indicator: "blue",
						message: `<pre style="white-space:pre-wrap">${frappe.utils.escape_html(out.head_html || "")}</pre>`,
						wide: true,
					});
				},
				TOOLS_GROUP
			);

			frm.add_custom_button(
				__("Publish to public site"),
				async () => {
					await frappe.call({
						method: "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme.publish_theme",
						args: { theme: frm.doc.name, company: frm.doc.company, note: "desk publish" },
					});
					await frm.reload_doc();
					frappe.show_alert({ message: __("Theme published."), indicator: "green" });
				},
				PRESET_GROUP
			);

			frm.add_custom_button(
				__("Rollback previous public"),
				async () => {
					await frappe.call({
						method: "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme.rollback_theme",
						args: { company: frm.doc.company, note: "desk rollback previous" },
					});
					await frm.reload_doc();
					frappe.show_alert({ message: __("Rolled back to previous public theme."), indicator: "orange" });
				},
				PRESET_GROUP
			);

			frm.add_custom_button(
				__("Publish history"),
				async () => {
					const r = await frappe.call({
						method: "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme.list_theme_publish_history",
						args: { company: frm.doc.company, limit_page_length: 10 },
					});
					const rows = (r.message && r.message.history) || [];
					const lines = rows.map((x) => {
						const active = x.apply_to_public_site ? " (active)" : "";
						const who = x.published_by || "-";
						const when = x.published_at || "-";
						return `<li><b>${frappe.utils.escape_html(x.name)}</b>${active} — ${frappe.utils.escape_html(who)} @ ${frappe.utils.escape_html(when)}</li>`;
					});
					frappe.msgprint({
						title: __("Publish history"),
						indicator: "blue",
						message: `<ul>${lines.join("") || "<li>No history yet.</li>"}</ul>`,
					});
				},
				PRESET_GROUP
			);

			frm.add_custom_button(
				__("Compare with active public"),
				async () => {
					const rHist = await frappe.call({
						method: "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme.list_theme_publish_history",
						args: { company: frm.doc.company, limit_page_length: 10 },
					});
					const hist = (rHist.message && rHist.message.history) || [];
					const active = hist.find((x) => x.apply_to_public_site);
					if (!active) {
						frappe.msgprint(__("No active published theme for this company."));
						return;
					}
					const r = await frappe.call({
						method: "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme.compare_themes",
						args: { theme_a: frm.doc.name, theme_b: active.name, company: frm.doc.company },
					});
					const out = r.message || {};
					const diffs = out.diffs || [];
					const rows = diffs.map((d) => {
						const field = frappe.utils.escape_html(d.field || "");
						const a = frappe.utils.escape_html(String(d.a ?? ""));
						const b = frappe.utils.escape_html(String(d.b ?? ""));
						return `<tr><td><b>${field}</b></td><td>${a}</td><td>${b}</td></tr>`;
					});
					frappe.msgprint({
						title: __("Diff vs active public theme"),
						indicator: "blue",
						message: diffs.length
							? `<table class="table table-bordered"><thead><tr><th>Field</th><th>This theme</th><th>Active</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
							: __("No differences."),
						wide: true,
					});
				},
				PRESET_GROUP
			);

			if (cint(frm.doc.apply_to_desk)) {
				setTimeout(() => tryDeskPreviewDebounced(frm), 0);
			}
		},
	});

	TOKEN_FIELDS.forEach((fieldname) => {
		frappe.ui.form.on("Experience Tenant Theme", fieldname, (frm) => {
			if (frm.is_new() || !cint(frm.doc.apply_to_desk)) return;
			if (frm._ett_suppress_preset_hook) return;
			tryDeskPreviewDebounced(frm);
		});
	});
})();
