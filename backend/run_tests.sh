#!/usr/bin/env bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
  python manage.py test --noinput --keepdb "$@"

#should be used only if you have a local postgres server running. it is faster than running tests via neon
