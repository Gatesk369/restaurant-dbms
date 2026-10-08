# Restaurant DBMS

Django backend for the restaurant app. Restaurant data is accessed with parameterized raw SQL and stored in Neon PostgreSQL.

## Requirements

- Python 3.14
- `pip`
- Access to this project in Neon

## Give a teammate access to the shared Neon database

1. Invite each teammate to the Neon project and grant access that lets them view connection details. Neon project Viewers cannot see connection strings; project Editors can. See [Neon project permissions](https://neon.com/blog/neon-now-has-per-project-permissions).
2. Tell them which Neon branch and database to use. They must select the same branch and database to see the same data. Neon branches have separate connection strings and isolated data; see [Neon branching](https://neon.com/docs/introduction/branching).
3. Have each teammate copy the pooled and direct URLs from the Neon Console's **Connect** panel. Use the pooled URL for the app and the direct (unpooled) URL for schema migrations. The pooled URL's hostname includes `-pooler`; see [Neon connection pooling](https://neon.com/docs/connect/connection-pooling/).

Do not send `.env` in chat or commit it to Git. Each teammate should create their own local `.env` from `.env.example` and paste the URLs there. `.env` is ignored by Git. The example file contains placeholders, not working credentials.

## Set up locally

From the repository root:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements-dev.txt
cp .env.example .env
```

On Windows PowerShell, activate the environment with:

```powershell
backend\.venv\Scripts\Activate.ps1
```

Generate a Django secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

In `.env`, replace `SECRET_KEY` with the generated value. Set `DEBUG=True` for local development. Replace `DATABASE_URL` with the pooled Neon URL and `DATABASE_URL_UNPOOLED` with the direct Neon URL. Both URLs should point to the same branch and database.

## Run against the existing shared database

From the repository root, with the virtual environment active:

```bash
cd backend
python manage.py check
python manage.py runserver
```

The API runs at <http://127.0.0.1:8000/> and Django admin at <http://127.0.0.1:8000/admin/>. The Django admin login is a Django superuser; it is separate from the restaurant staff records. Ask the project maintainer before creating or changing shared database schema.

## Database schema changes

Restaurant models are raw SQL repositories, not Django ORM models. Do not run `makemigrations` for restaurant schema changes. Create a numbered migration file in the relevant app's `migrations/` directory using `migrations.RunSQL`, include a reverse operation when it is safe, and apply it with Django's migration runner. For example:

```bash
USE_UNPOOLED_DATABASE_URL=1 python manage.py migrate menu
```

The `USE_UNPOOLED_DATABASE_URL=1` prefix makes Django use `DATABASE_URL_UNPOOLED` for that command. Keep already-applied migration files unchanged. Django's built-in migrations for sessions, admin, and authentication remain managed with Django migrations.

`python manage.py init_sql_schema` is a bootstrap command for initializing application tables and the SQL subtotal trigger. It uses `CREATE TABLE IF NOT EXISTS`, so it does not reconcile existing tables with changed definitions. Do not run it against the shared Neon branch as a routine setup step. Coordinate with the maintainer before initializing a new empty branch or applying schema changes.

## Pre-commit hooks

`pre-commit` is installed by `requirements-dev.txt`. Installing the Python package does not activate its Git hook. Run this once from the repository root to make Git run the configured hooks before each commit:

```bash
pre-commit install
```

Run all hooks manually with:

```bash
pre-commit run --all-files
```

## Checks and tests

From `backend/`:

```bash
python manage.py check
python manage.py test
pytest
```
