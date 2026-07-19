frappe.pages["tm-executive-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({ parent: wrapper, title: __("tm-executive-dashboard"), single_column: true });
	frappe.call({ method: "omnexa_theme_manager.tm_global_benchmark.get_global_tm_score", callback(r) {
		const s = r.message || {};
		$(page.body).html(`<div class="p-4"><h4>Score: <b>${s.weighted_score||0}</b></h4><p>${s.gaps_closed||0} / ${s.gaps_total||48}</p></div>`);
	}});
};
