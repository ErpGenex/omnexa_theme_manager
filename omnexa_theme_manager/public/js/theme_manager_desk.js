// Copyright (c) 2026, Omnexa and contributors
// License: MIT. See license.txt
// Theme Manager workspace: active-theme banner + theme stack admin (System Manager).

(function () {
	"use strict";

	const BANNER_ID = "omnexa-tm-active-theme-banner";
	const ADMIN_ID = "omnexa-tm-stack-admin";

	frappe.provide("frappe.theme_manager");

	frappe.theme_manager.open_personal_theme_studio = function () {
		if (window.erpgenexTheme0426 && typeof window.erpgenexTheme0426.openStudio === "function") {
			window.erpgenexTheme0426.openStudio();
			return;
		}
		frappe.show_alert({
			message: __("Desk theme studio is unavailable. Enable {0}.", ["omnexa_theme_manager"]),
			indicator: "orange",
		});
	};

	function removeEl(id) {
		const el = document.getElementById(id);
		if (el && el.parentNode) el.parentNode.removeChild(el);
	}

	function isThemeManagerRoute() {
		const r = frappe.get_route && frappe.get_route();
		return r && r[0] === "Workspaces" && r[1] === "Theme Manager";
	}

	function escapeHtml(s) {
		return frappe.utils.escape_html(String(s || ""));
	}

	function mountBannerPayload(msg, stack) {
		const enabled = frappe.boot && frappe.boot.omnexa_desk_theme_enabled !== 0;
		/* get_desk_theme_payload puts composed tokens on msg.theme (flat). */
		const t = (msg && msg.theme) || {};
		const tokens = t.tokens || {};
		const docName = t.theme || "";
		const presetLabel = t.preset_label || t.preset || "";
		const title = __("Active Desk Theme");
		const userCo = (msg.user_company || "").trim();
		const themeCo = (t.company || msg.active_theme_company || "").trim();
		const companyMismatch =
			userCo && themeCo && userCo !== themeCo
				? `<div class="alert alert-warning mb-0 mt-2" style="max-width:56rem">
					<b>${__("Company mismatch")}</b> — ${__(
						"Your session default company is {0}, but the Desk theme row in use is for {1}. Set Session Default to {1} or activate a theme for {0} so switching works as expected.",
						[userCo, themeCo]
					)}
				</div>`
				: "";

		const swatch = (hex, label) =>
			`<div class="omnexa-tm-swatch" title="${escapeHtml(label)}">
				<span class="omnexa-tm-swatch-chip" style="background:${escapeHtml(hex)}"></span>
				<small>${escapeHtml(label)}</small>
			</div>`;

		const primary = tokens.primary_color || "#2563eb";
		const bg = tokens.background_color || "#f3f7fb";
		const surface = tokens.surface_color || "#ffffff";

		const canAdmin = stack && stack.can_manage_stack;
		const disabledHint = canAdmin
			? `<p class="small mb-0">${__("Use “Theme stack & app” below to turn the desk theme on.")}</p>`
			: "";

		const disabledHtml = enabled
			? ""
			: `<div class="alert alert-danger mb-0 mt-2" style="max-width:56rem">
				<b>${__("Desk theme runtime is off")}</b> — ${__(
					"ERPGenEx desk CSS/JS are not loaded for this site until the runtime is enabled."
				)}
				${disabledHint}
			</div>`;

		const frappeDefaultBtn = canAdmin
			? `<button type="button" class="btn btn-xs btn-warning omnexa-tm-frappe-default" title="${escapeHtml(
					__("Turn off ERPGenEx desk styling and use the standard Frappe Desk (site-wide).")
			  )}">${__("Frappe default desk")}</button>`
			: "";

		return `
			<div class="omnexa-tm-banner-inner">
				<div class="omnexa-tm-banner-head">
					<div>
						<div class="omnexa-tm-banner-title">${escapeHtml(title)}</div>
						<div class="omnexa-tm-banner-meta text-muted">
							${docName ? `<span><b>${__("Theme")}:</b> ${escapeHtml(docName)}</span>` : `<span>${__("Using defaults (no row with “Apply to Desk”)")}</span>`}
							${presetLabel ? `<span><b>${__("Preset")}:</b> ${escapeHtml(presetLabel)}</span>` : ""}
							${
								themeCo
									? `<span><b>${__("Theme company")}:</b> ${escapeHtml(themeCo)}</span>`
									: ""
							}
							${
								userCo
									? `<span><b>${__("Your default company")}:</b> ${escapeHtml(userCo)}</span>`
									: ""
							}
						</div>
					</div>
					<div class="omnexa-tm-banner-actions">
						<button type="button" class="btn btn-xs btn-primary omnexa-tm-reload">${__("Reload desk colours")}</button>
						${frappeDefaultBtn}
						<button type="button" class="btn btn-xs btn-default omnexa-tm-open-list">${__("Open theme list")}</button>
						<button type="button" class="btn btn-xs btn-default omnexa-tm-studio">${__("Personal tweaks")}</button>
					</div>
				</div>
				<div class="omnexa-tm-swatches">
					${swatch(primary, __("Primary"))}
					${swatch(bg, __("Background"))}
					${swatch(surface, __("Surface"))}
				</div>
				<p class="text-muted small mb-0" style="max-width:56rem;line-height:1.45">
					${__(
						"Desk theme is per company: one active row per company. To switch again, pick another row for the same company (or change your Session Default company), then Activate for Desk or Apply to Desk → Save."
					)}
				</p>
				${companyMismatch}
				${disabledHtml}
			</div>`;
	}

	function mountAdminPanel(st) {
		const themeApp = st.theme_runtime_app || "erpgenex_theme_0426";
		const runtimeOn = cint(st.desk_theme_runtime_enabled);
		const themeInstalled = st.theme_app_installed;
		const onBench = st.theme_app_on_bench;
		const blockers = (st.apps_blocking_theme_removal || []).join(", ");

		const runtimeRow = runtimeOn
			? `<span class="indicator-pill green">${__("Desk theme runtime: on")}</span>`
			: `<span class="indicator-pill red">${__("Desk theme runtime: off")}</span>`;

		const themeRow = themeInstalled
			? `<span class="indicator-pill green">${__("App {0}: installed", [themeApp])}</span>`
			: `<span class="indicator-pill orange">${__("App {0}: not installed", [themeApp])}</span>`;

		const installDisabled = themeInstalled || !onBench;
		const installTitle = !onBench
			? __("Add the app to this bench (apps folder + apps.txt), then use Install.")
			: "";

		return `
			<div class="omnexa-tm-stack-admin-inner">
				<div class="omnexa-tm-stack-admin-head">
					<div>
						<div class="omnexa-tm-stack-admin-title">${__("Theme stack & app")}</div>
						<p class="text-muted small mb-0">${__(
							"Turn the ERPGenEx desk theme on or off for this site, and install or remove the theme app on this site. System Manager only."
						)}</p>
					</div>
				</div>
				<div class="omnexa-tm-stack-meta">
					${runtimeRow}
					${themeRow}
				</div>
				<div class="omnexa-tm-stack-frappe-default mb-2">
					<button type="button" class="btn btn-sm btn-warning omnexa-tm-frappe-default">${__(
						"Use standard Frappe Desk (default theme)"
					)}</button>
					<p class="text-muted small mb-0" style="margin-top:0.35rem">${__(
						"Disables ERPGenEx desk styling on this site and reloads the page. Same as “Disable desk theme” in site config."
					)}</p>
				</div>
				<div class="omnexa-tm-stack-actions">
					<div class="btn-group" role="group">
						<button type="button" class="btn btn-xs btn-primary omnexa-tm-runtime-on" ${runtimeOn ? "disabled" : ""}>${__(
							"Enable desk theme"
						)}</button>
						<button type="button" class="btn btn-xs btn-default omnexa-tm-runtime-off" ${!runtimeOn ? "disabled" : ""}>${__(
							"Disable desk theme"
						)}</button>
					</div>
					<button type="button" class="btn btn-xs btn-default omnexa-tm-install-theme-app" ${installDisabled ? "disabled" : ""} title="${escapeHtml(
						installTitle
					)}">${__("Install theme app on site")}</button>
					<button type="button" class="btn btn-xs btn-default omnexa-tm-remove-theme-app" ${!themeInstalled ? "disabled" : ""}>${__(
						"Remove theme app from site"
					)}</button>
					<button type="button" class="btn btn-xs btn-link text-muted omnexa-tm-uninstall-manager">${__(
						"Uninstall Theme Manager app…"
					)}</button>
				</div>
				${
					blockers
						? `<p class="text-muted small mb-0 omnexa-tm-blockers-note">${__(
								"Removing {0} is blocked while required by: {1}.",
								[themeApp, escapeHtml(blockers)]
						  )}</p>`
						: ""
				}
				<p class="text-muted small mb-0">${__(
					"After changing runtime or apps, reload this page (F5) so the Desk loads the correct scripts."
				)}</p>
				<p class="text-muted small mb-0">${__(
					"CLI equivalent: {0} / {1} — bench still required to add code to the server.",
					["<code>bench set-config disable_omnexa_desk_theme 0|1</code>", "<code>bench install-app / uninstall-app</code>"]
				)}</p>
			</div>`;
	}

	function cint(v) {
		return parseInt(v, 10) || 0;
	}

	function restoreFrappeDefaultDesk() {
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

	frappe.theme_manager.restore_frappe_default_desk = restoreFrappeDefaultDesk;

	function bindBanner(el) {
		el.querySelector(".omnexa-tm-reload")?.addEventListener("click", () => {
			const finish = () => {
				frappe.show_alert({ message: __("Desk colours updated."), indicator: "green" });
				scheduleBanner();
			};
			if (window.erpgenexTheme0426 && window.erpgenexTheme0426.refreshFromServer) {
				if (window.erpgenexTheme0426.clearPersonalThemeOverrides) {
					window.erpgenexTheme0426.clearPersonalThemeOverrides();
				}
				window.erpgenexTheme0426.refreshFromServer().then(finish).catch(finish);
			} else {
				frappe.show_alert({
					message: __("Reload the page after saving a theme with “Apply to Desk”."),
					indicator: "orange",
				});
				window.location.reload();
			}
		});
		el.querySelector(".omnexa-tm-open-list")?.addEventListener("click", () => {
			frappe.set_route("List", "Experience Tenant Theme", "List");
		});
		el.querySelector(".omnexa-tm-studio")?.addEventListener("click", () => {
			frappe.theme_manager.open_personal_theme_studio();
		});
		el.querySelector(".omnexa-tm-frappe-default")?.addEventListener("click", restoreFrappeDefaultDesk);
	}

	function refreshStackPanel() {
		scheduleBanner();
	}

	function bindAdmin(el) {
		el.querySelector(".omnexa-tm-frappe-default")?.addEventListener("click", restoreFrappeDefaultDesk);
		el.querySelector(".omnexa-tm-runtime-on")?.addEventListener("click", () => {
			frappe.call({
				method: "omnexa_theme_manager.theme_stack_admin.set_desk_theme_runtime_enabled",
				args: { enabled: 1 },
				freeze: true,
				callback() {
					frappe.show_alert({
						message: __("Desk theme runtime enabled. Reload the page."),
						indicator: "green",
					});
					refreshStackPanel();
				},
			});
		});
		el.querySelector(".omnexa-tm-runtime-off")?.addEventListener("click", () => {
			frappe.call({
				method: "omnexa_theme_manager.theme_stack_admin.set_desk_theme_runtime_enabled",
				args: { enabled: 0 },
				freeze: true,
				callback() {
					frappe.show_alert({
						message: __("Desk theme runtime disabled. Reload the page."),
						indicator: "orange",
					});
					refreshStackPanel();
				},
			});
		});
		el.querySelector(".omnexa-tm-install-theme-app")?.addEventListener("click", () => {
			frappe.confirm(
				__(
					"Install the ERPGenEx desk theme app on this site? This may take a minute and runs database updates."
				),
				() => {
					frappe.call({
						method: "omnexa_theme_manager.theme_stack_admin.install_theme_runtime_app",
						freeze: true,
						callback() {
							frappe.show_alert({
								message: __("Theme app installed. Reload the page."),
								indicator: "green",
							});
							refreshStackPanel();
						},
					});
				}
			);
		});
		el.querySelector(".omnexa-tm-remove-theme-app")?.addEventListener("click", () => {
			frappe.confirm(
				__(
					"Remove the desk theme app from this site? A backup may run first. You cannot remove it while other installed apps list it as a dependency."
				),
				() => {
					frappe.call({
						method: "omnexa_theme_manager.theme_stack_admin.remove_theme_runtime_app",
						freeze: true,
						callback() {
							frappe.show_alert({
								message: __("Theme app removed from site. Reload the page."),
								indicator: "orange",
							});
							refreshStackPanel();
						},
					});
				}
			);
		});
		el.querySelector(".omnexa-tm-uninstall-manager")?.addEventListener("click", () => {
			const phrase = "UNINSTALL OMNEXA THEME MANAGER";
			frappe.prompt(
				[
					{
						fieldname: "confirm",
						fieldtype: "Data",
						label: __("Type exactly: {0}", [phrase]),
						reqd: 1,
					},
				],
				(values) => {
					if ((values.confirm || "").trim() !== phrase) {
						frappe.msgprint(__("Phrase does not match. No changes."));
						return;
					}
					frappe.call({
						method: "omnexa_theme_manager.theme_stack_admin.uninstall_theme_manager_app",
						args: { confirmation_phrase: values.confirm },
						freeze: true,
						callback() {
							frappe.show_alert({
								message: __(
									"Theme Manager was uninstalled from this site. Reload or navigate away."
								),
								indicator: "orange",
							});
							window.setTimeout(() => window.location.reload(), 600);
						},
					});
				},
				__("Uninstall Theme Manager"),
				__("Uninstall")
			);
		});
	}

	function fetchAndMount(tries) {
		if (!isThemeManagerRoute()) {
			removeEl(BANNER_ID);
			removeEl(ADMIN_ID);
			return;
		}
		const main = document.querySelector(".layout-main-section");
		if (!main) {
			if ((tries || 0) < 14) setTimeout(() => fetchAndMount((tries || 0) + 1), 200);
			return;
		}

		frappe.call({
			method: "omnexa_theme_manager.desk_theme.get_desk_theme_payload",
			freeze: false,
			callback(r1) {
				frappe.call({
					method: "omnexa_theme_manager.theme_stack_admin.get_theme_stack_status",
					freeze: false,
					callback(r2) {
						removeEl(BANNER_ID);
						removeEl(ADMIN_ID);
						const stack = r2.message || {};

						const wrap = document.createElement("div");
						wrap.id = BANNER_ID;
						wrap.className = "omnexa-tm-active-theme-banner";
						wrap.innerHTML = mountBannerPayload(r1.message || {}, stack);
						main.insertAdjacentElement("afterbegin", wrap);
						bindBanner(wrap);

						if (stack.can_manage_stack) {
							const adm = document.createElement("div");
							adm.id = ADMIN_ID;
							adm.className = "omnexa-tm-stack-admin";
							adm.innerHTML = mountAdminPanel(stack);
							wrap.insertAdjacentElement("afterend", adm);
							bindAdmin(adm);
						}
					},
					error() {
						removeEl(BANNER_ID);
						removeEl(ADMIN_ID);
					},
				});
			},
			error() {
				removeEl(BANNER_ID);
				removeEl(ADMIN_ID);
			},
		});
	}

	function scheduleBanner() {
		if (!isThemeManagerRoute()) {
			removeEl(BANNER_ID);
			removeEl(ADMIN_ID);
			return;
		}
		fetchAndMount(0);
	}

	function mount_theme_manager_desk() {
		if (!window.frappe || !frappe.boot || frappe.session.user === "Guest") return;
		if (window.__theme_manager_desk_mounted) return;
		window.__theme_manager_desk_mounted = true;

		scheduleBanner();
		if (frappe.router && frappe.router.on) {
			frappe.router.on("change", () => setTimeout(scheduleBanner, 80));
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", mount_theme_manager_desk);
	} else {
		mount_theme_manager_desk();
	}
	$(window).on("load", mount_theme_manager_desk);
})();
