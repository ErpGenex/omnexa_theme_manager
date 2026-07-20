app_name = "omnexa_theme_manager"
app_title = "ErpGenEx Theme Manager"
app_publisher = "ErpGenEx"
app_description = "Desk workspace to upload, import, and switch company Desk themes safely (Experience Tenant Theme)."
app_email = "dev@erpgenex.com"
app_license = "mit"

required_apps = ["omnexa_experience", "erpgenex_theme_0426"]
before_install = "omnexa_theme_manager.install.enforce_supported_frappe_version"
before_migrate = "omnexa_theme_manager.install.enforce_supported_frappe_version"

# Desk visuals: app erpgenex_theme_0426 (loader + boot). Disable: bench set-config disable_omnexa_desk_theme 1
app_include_css = [
	"/assets/omnexa_theme_manager/css/theme_manager_desk.css",
	"/assets/omnexa_theme_manager/css/experience_tenant_theme_form.css",
]
app_include_js = [
	"/assets/omnexa_theme_manager/js/theme_manager_desk.js",
]

doctype_js = {
	"Experience Tenant Theme": "public/js/experience_tenant_theme.js"
	}
doctype_list_js = {
	"Experience Tenant Theme": "public/js/experience_tenant_theme_list.js"
	}

override_whitelisted_methods = {
	"omnexa_experience.omnexa_experience.desk_theme.get_desk_theme_payload": "omnexa_theme_manager.desk_theme.get_desk_theme_payload",
	"omnexa_experience.omnexa_experience.desk_theme.get_theme_studio_defaults": "omnexa_theme_manager.desk_theme.get_theme_studio_defaults",
	"frappe.desk.desktop.get_desktop_page": "omnexa_theme_manager.desktop_page.get_desktop_page"
	}

after_install = "omnexa_theme_manager.install.after_install"
after_migrate = "omnexa_theme_manager.install.after_migrate"

# Theme stack (runtime + app install) API: omnexa_theme_manager.theme_stack_admin.*

# default_roles = []  # use workspace visibility (public)
