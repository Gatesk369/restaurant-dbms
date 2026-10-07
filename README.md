# Restaurant DBMS backend

This repository contains an early-stage Django backend. The Django project is in `backend/` and currently uses SQLite for local development.

## Requirements

- Python 3.14
- `pip`

## Set up locally

Run these commands from the repository root:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements-dev.txt
cp .env.example .env
```

`requirements-dev.txt` installs the runtime requirements plus development tools, including pytest and pre-commit. For a runtime-only install, use `backend/requirements.txt` instead.

On Windows PowerShell, activate the virtual environment with:

```powershell
backend\.venv\Scripts\Activate.ps1
```

Generate a Django secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the generated value into `.env`, replacing the example value:

```dotenv
SECRET_KEY=your-generated-secret-key
```

Keep `.env` local. It is ignored by Git; share `.env.example` instead, and never put a real secret in it.

## Initialize and run

From the repository root, with the virtual environment active:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The development server runs at <http://127.0.0.1:8000/>. The Django admin is at <http://127.0.0.1:8000/admin/>.

## Pre-commit hooks

Install the Git hook once from the repository root, with the virtual environment active:

```bash
pre-commit install
```

After that, the configured hooks run automatically on files staged for each commit. If a hook changes a file (for example, Ruff formatting), stage the changes and commit again. To run all hooks across the repository manually:

```bash
pre-commit run --all-files
```

## Checks and tests

Run Django's system check and tests from `backend/`:

```bash
python manage.py check
python manage.py test
```

Pytest is also available in the development environment. Run it from `backend/`:

```bash
pytest
```

The app test files are currently placeholders, so pytest does not collect tests yet.
