// Copyright (c) 2026, Omnexa and contributors
// License: MIT. See license.txt

(function () {
	"use strict";

	const PY = "omnexa_experience.omnexa_experience.doctype.experience_tenant_theme.experience_tenant_theme";

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

	function one_selected(listview) {
		const names = listview.get_checked_items(true);
		if (!names.length) {
			frappe.msgprint({
				title: __("Theme Manager"),
				message: __("Select exactly one theme row first."),
				indicator: "orange",
			});
			return null;
		}
		if (names.length > 1) {
			frappe.msgprint({
				title: __("Theme Manager"),
				message: __("Select only one theme at a time."),
				indicator: "orange",
			});
			return null;
		}
		return names[0];
	}

	frappe.listview_settings["Experience Tenant Theme"] = {
		get_indicator(doc) {
			if (doc.apply_to_desk) {
				return [__("Active for Desk"), "green", "apply_to_desk,=,1"];
			}
		},
		onload(listview) {
			listview.page.add_inner_button(__("Help"), () => {
				frappe.msgprint({
					title: __("How themes work"),
					message: `<div style="max-width:36rem;line-height:1.55">
						<p><b>${__("Save & switch")}</b> — ${__(
							"Each row is one saved theme for a company. Activating for Desk only marks that row active; other rows are kept."
						)}</p>
						<p><b>${__("Upload")}</b> — ${__(
							"Use “Upload theme file” with a JSON export from this system (or a compatible snapshot). Your data is validated before save."
						)}</p>
						<p><b>${__("Brand")}</b> — ${__(
							"Open a theme record to upload a logo and adjust colors. Contrast rules protect readability."
						)}</p>
					</div>`,
					wide: true,
				});
			});

			listview.page.add_inner_button(__("Activate for Desk"), () => {
				const theme = one_selected(listview);
				if (!theme) return;
				frappe.confirm(
					__(
						"Set this theme as the active Desk look for its company? Other saved themes stay available—you can switch back anytime."
					),
					() => {
						frappe.call({
							method: `${PY}.activate_desk_theme`,
							args: { theme },
							freeze: true,
							callback(r) {
								if (reloadIfDeskRuntimeWasOff()) return;
								const msg = r.message || {};
								const finish = () => {
									frappe.show_alert({
										message: __("Desk theme activated."),
										indicator: "green",
									});
									listview.refresh();
								};
								waitForDeskThemeRuntime().then((ready) => {
									if (
										ready &&
										window.erpgenexTheme0426 &&
										typeof window.erpgenexTheme0426.clearPersonalThemeOverrides === "function"
									) {
										window.erpgenexTheme0426.clearPersonalThemeOverrides();
									}
									if (ready && window.erpgenexTheme0426 && window.erpgenexTheme0426.refreshFromServer) {
										window.erpgenexTheme0426
											.refreshFromServer({
												company: msg.company,
												prefer_theme: msg.name || theme,
											})
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

			listview.page.add_inner_button(__("Upload theme file"), () => {
				const d = new frappe.ui.Dialog({
					title: __("Upload theme (.json)"),
					fields: [
						{
							fieldname: "theme",
							fieldtype: "Data",
							label: __("Merge into existing theme (optional)"),
							description: __(
								"Leave empty to create a new theme. If set, values from the file update that document."
							),
						},
						{
							fieldname: "json_file",
							fieldtype: "Attach",
							label: __("JSON file"),
							reqd: 1,
						},
					],
					primary_action_label: __("Import"),
					primary_action(values) {
						const url = values.json_file;
						if (!url) {
							frappe.msgprint(__("Choose a JSON file."));
							return;
						}
						frappe.call({
							method: "omnexa_theme_manager.desk_theme.get_json_from_file_url",
							args: { file_url: url },
							freeze: true,
							callback(r) {
								const payload = r.message;
								frappe.call({
									method: `${PY}.import_theme_json`,
									args: {
										theme: values.theme || null,
										payload,
									},
									freeze: true,
									callback() {
										frappe.show_alert({
											message: __("Theme imported successfully."),
											indicator: "green",
										});
										d.hide();
										listview.refresh();
									},
								});
							},
						});
					},
				});
				d.show();
			});

			listview.page.add_inner_button(__("Export JSON"), () => {
				const theme = one_selected(listview);
				if (!theme) return;
				frappe.call({
					method: `${PY}.export_theme_json`,
					args: { theme },
					freeze: true,
					callback(r) {
						const snap = (r.message && r.message.snapshot) || {};
						const txt = JSON.stringify(snap, null, 2);
						const blob = new Blob([txt], { type: "application/json;charset=utf-8" });
						const a = document.createElement("a");
						a.href = URL.createObjectURL(blob);
						a.download = `tenant-theme-${theme}.json`;
						a.click();
						URL.revokeObjectURL(a.href);
						frappe.show_alert({
							message: __("Download started."),
							indicator: "blue",
						});
					},
				});
			});

			listview.page.add_inner_button(__("Paste JSON"), () => {
				const d = new frappe.ui.Dialog({
					title: __("Import theme from clipboard"),
					fields: [
						{
							fieldname: "theme",
							fieldtype: "Data",
							label: __("Existing theme name (optional)"),
							description: __(
								"Leave empty to create a new document (company must be present in JSON)."
							),
						},
						{
							fieldname: "payload",
							fieldtype: "Code",
							options: "JSON",
							label: __("JSON"),
							reqd: 1,
						},
					],
					primary_action_label: __("Import"),
					primary_action(values) {
						let payload = values.payload;
						if (typeof payload === "string") {
							try {
								payload = JSON.parse(payload);
							} catch (e) {
								frappe.msgprint(__("Invalid JSON."));
								return;
							}
						}
						frappe.call({
							method: `${PY}.import_theme_json`,
							args: {
								theme: values.theme || null,
								payload,
							},
							freeze: true,
							callback() {
								frappe.show_alert({
									message: __("Theme imported successfully."),
									indicator: "green",
								});
								d.hide();
								listview.refresh();
							},
						});
					},
				});
				d.show();
			});
		},
	};
})();
