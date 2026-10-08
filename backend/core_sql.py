"""Load the project's explicit SQL schema into the configured database."""

from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Create application tables from the schema for the configured database."

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            raise RuntimeError("The application schema requires PostgreSQL.")

        schema_path = Path(__file__).with_name("schema.sql")
        schema = schema_path.read_text(encoding="utf-8")
        statements = [
            statement.strip()
            for statement in schema.split("-- django:statement")[1:]
            if statement.strip()
        ]
        with transaction.atomic(), connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)

        self.stdout.write(self.style.SUCCESS("Raw SQL schema created."))
