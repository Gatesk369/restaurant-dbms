# Restaurant DBMS

Restaurant DBMS is a full-stack restaurant ordering and operations system. Customers use a self-service ordering station, while restaurant staff use a role-based workspace to manage orders, payments, menu items, and sales reports.

## How the system works

1. A customer selects a table, browses available menu items, and submits an order with any kitchen instructions through the ordering station at `/station`.
2. The Django API stores the order in PostgreSQL. The database assigns an available wait staff member when possible, or leaves the order pending until one becomes available.
3. Wait staff and kitchen staff use the staff workspace to track and progress orders. Kitchen staff prepare orders; wait staff serve them. Managers can oversee orders and manage the menu.
4. After an order is served, a cashier records its cash or mobile-money payment. The database creates its sales record, and managers can review sales and operational reports.

The React frontend communicates with the Django REST API over HTTP. Staff sign in to a role-protected workspace; customers order through a separate station flow. The API enforces role access and uses parameterized SQL for restaurant data operations. PostgreSQL constraints and triggers preserve relationships and automate tasks such as calculating item subtotals, assigning wait staff, updating table availability, and recording sales.

## Technology

- **Frontend:** React 19, TypeScript, React Router 8, and Tailwind CSS 4; built as a single-page app.
- **Backend:** Python 3.14, Django 6.1, and Django REST Framework.
- **Database:** PostgreSQL hosted on Neon. Restaurant tables are defined in `backend/schema.sql` and accessed through parameterized raw SQL; Django migrations manage Django's own auth and admin tables.
- **Development:** Vite-powered frontend dev server, with the API and database configured through local environment files.

The customer station and staff workspace run as separate frontend routes. Staff features depend on role: cashiers handle payments, wait staff and kitchen staff handle order service, and managers also manage the menu and view reports. The cashier records payments after service; the customer ordering flow does not collect payment.

For architecture details, data relationships, enterprise rules, endpoints, and reports, see the [DBMS design reference](docs/data-dictionary.md). For installation and commands, continue with the setup sections below. The [frontend README](frontend/README.md) covers frontend setup, environment variables, and scripts.

## Design Documentation

See [the data dictionary and DBMS design reference](docs/data-dictionary.md)
for the table attributes, relationships, triggers, API/form mappings, report
queries, and end-to-end database flow.

Frontend documentation:

- [Frontend implementation plan](docs/frontend-implementation-plan.md): scope,
  decisions, backend gaps, per-screen specifications, phases and fidelity checks.
- [Design system reference](docs/design-system.md): tokens and component values
  taken from the mock-ups.
- [`docs/design/`](docs/design/): the UI/UX design document and the clickable
  mock-ups (staff app and ordering station), plus a script that unpacks them.

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

### Backend tests

The backend test script uses a local PostgreSQL server; it does not use Neon.
Install PostgreSQL, make sure the server is running on `localhost:5432`, and
configure a `postgres` database user with the password `postgres`. These are
the connection settings currently built into `backend/run_tests.sh`.

On Ubuntu or Debian, install and start PostgreSQL from a terminal:

```bash
sudo apt update
sudo apt install postgresql
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
pg_isready -h localhost -p 5432
```

The last command should report that the server is accepting connections. The
PostgreSQL project provides [Ubuntu installation instructions](https://www.postgresql.org/download/linux/ubuntu/).

On Windows, download and run the [official PostgreSQL installer](https://www.postgresql.org/download/windows/).
It installs PostgreSQL as a Windows service. Set the `postgres` user's
password to `postgres` during setup to match the test script, and ensure the
service is running before testing. The installer page has the available
versions and platform details.

Then, from `backend/`, run the test suite with the project script:

```bash
./run_tests.sh
```

The script keeps the test database between runs for faster startup. Pass
Django test arguments through the script when needed, for example:

```bash
./run_tests.sh orders payments
```

Run the backend configuration check separately:

```bash
python manage.py check
```

For frontend unit tests, run `npm test` from `frontend/`. See the
[frontend README](frontend/README.md) for its other test and quality-check
commands.

## Load demonstration data

Use `seed.sql` only with a dedicated development database whose schema and menu items are already in place. It atomically replaces the demonstration tables, staff, customers, orders, order items, payments, and sales records while preserving every `menu_items` row. It creates randomized activity over the prior 60 days through the current day, including every supported order state. The schema triggers compute item subtotals and create sales records from payments. Do not run it against the shared Neon branch.

After setting `DATABASE_URL_UNPOOLED` to a dedicated development database and ensuring it has menu items, load or refresh the sample data from `backend/`:

```bash
python manage.py init_sql_schema
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f ../seed.sql
```

All sample staff accounts use the development-only password `DemoPass123!`.
