# Bakery Management System

A professional monorepo for managing bakery operations, built with Django and React.

## Tech Stack

-   **Backend:** Django (Python 3.12)
-   **Frontend:** React (TypeScript, Bun)
-   **Tooling:** Ruff (Linting/Formatting), ESLint, Prettier
-   **Automation:** PowerShell Scripts, Husky, Lint-Staged
-   **CI:** GitHub Actions

## Project Structure

-   `api/`: Django backend application.
-   `ui/`: React frontend application.
-   `scripts/`: Local automation scripts for development.

## Getting Started

### Prerequisites

-   Python 3.12
-   Bun
-   Pipenv

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/hmyunis/bakery-mgt-app.git
    cd bakery-mgt-app
    ```

2. Install root dependencies (Husky, Lint-Staged):

    ```bash
    bun install
    ```

3. Setup Backend:

    ```bash
    cd api
    pipenv install --dev
    ```

4. Setup Frontend:
    ```bash
    cd ui
    bun install
    ```

## Development

Use the provided PowerShell scripts for common tasks:

-   **Fix code style:** `.\scripts\fix.ps1`
-   **Run checks:** `.\scripts\check.ps1`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
