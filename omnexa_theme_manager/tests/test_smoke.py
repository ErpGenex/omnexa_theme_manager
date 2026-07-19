from frappe.tests.utils import FrappeTestCase

from omnexa_theme_manager import hooks


class TestThemeManagerSmoke(FrappeTestCase):
	def test_hooks_are_present(self):
		self.assertEqual(hooks.app_name, "omnexa_theme_manager")
		self.assertIn("omnexa_experience", hooks.required_apps)
		self.assertIsInstance(hooks.override_whitelisted_methods, dict)

