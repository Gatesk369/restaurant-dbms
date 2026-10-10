from django.core.management import call_command
from django.test.runner import DiscoverRunner


class SQLSchemaRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        config = super().setup_databases(**kwargs)
        call_command("init_sql_schema")  # connection now points at the test DB
        return config
