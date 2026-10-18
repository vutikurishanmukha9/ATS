import json
from typing import Any

from sqlalchemy import String, Text, TypeDecorator
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class TextArrayType(TypeDecorator):
    """
    Platform-independent array of strings.
    Uses postgresql.ARRAY(String) on Postgres, and JSON-encoded Text on SQLite.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.ARRAY(String))
        else:
            return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect):
        if value is None:
            return [] if dialect.name == "postgresql" else "[]"
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value: Any, dialect):
        if value is None:
            return []
        if dialect.name == "postgresql":
            return list(value)
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return list(value)
