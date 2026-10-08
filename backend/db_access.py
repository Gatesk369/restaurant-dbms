"""Small, parameterized SQL helpers shared by the application repositories."""

import re

from django.db import connection


def _identifier(value):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", value):
        raise ValueError("Invalid SQL identifier")
    return value


def fetch_one(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = cursor.fetchone()
        if row is None:
            return None
        return dict(zip((column[0] for column in cursor.description), row))


def fetch_all(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        names = [column[0] for column in cursor.description]
        return [dict(zip(names, row)) for row in cursor.fetchall()]


def insert(table, values):
    table = _identifier(table)
    values = {_identifier(column): value for column, value in values.items()}
    columns = ", ".join(values)
    placeholders = ", ".join(["%s"] * len(values))
    with connection.cursor() as cursor:
        statement = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        cursor.execute(f"{statement} RETURNING *", tuple(values.values()))
        row = cursor.fetchone()
        return dict(zip((column[0] for column in cursor.description), row))


def update(table, key, key_value, values):
    table, key = _identifier(table), _identifier(key)
    values = {_identifier(column): value for column, value in values.items()}
    if not values:
        return fetch_one(f"SELECT * FROM {table} WHERE {key} = %s", (key_value,))
    assignments = ", ".join(f"{column} = %s" for column in values)
    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET {assignments} WHERE {key} = %s",
            (*values.values(), key_value),
        )
    return fetch_one(f"SELECT * FROM {table} WHERE {key} = %s", (key_value,))


def delete(table, key, key_value):
    table, key = _identifier(table), _identifier(key)
    with connection.cursor() as cursor:
        cursor.execute(f"DELETE FROM {table} WHERE {key} = %s", (key_value,))
        return cursor.rowcount > 0


class SQLRepository:
    """CRUD operations for one fixed table; identifiers come from subclasses."""

    table = ""
    key = ""

    @classmethod
    def get(cls, identifier):
        return fetch_one(
            f"SELECT * FROM {_identifier(cls.table)} WHERE {_identifier(cls.key)} = %s",
            (identifier,),
        )

    @classmethod
    def all(cls):
        return fetch_all(
            f"SELECT * FROM {_identifier(cls.table)} ORDER BY {_identifier(cls.key)}"
        )

    @classmethod
    def create(cls, **values):
        return insert(cls.table, values)

    @classmethod
    def update(cls, identifier, **values):
        return update(cls.table, cls.key, identifier, values)

    @classmethod
    def delete(cls, identifier):
        return delete(cls.table, cls.key, identifier)
