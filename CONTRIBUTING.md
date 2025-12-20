# Contributing to Bakery Management System

Thank you for your interest in contributing!

## Development Workflow

1. **Clone the repo** and install dependencies as described in the [README.md](README.md).
2. **Create a new branch** for your feature or bugfix:
    ```bash
    git checkout -b feature/your-feature-name
    ```
3. **Make your changes.**
4. **Run the fixer script** to ensure code style consistency:
    ```powershell
    .\scripts\fix.ps1
    ```
5. **Run the check script** to verify linting, types, and builds:
    ```powershell
    .\scripts\check.ps1
    ```
6. **Commit your changes.** Git hooks will automatically run lint-staged to ensure quality.
7. **Push to your fork** and submit a Pull Request.

## Code Standards

-   **Python:** We use [Ruff](https://github.com/astral-sh/ruff) for linting and formatting.
-   **TypeScript/React:** We use ESLint and Prettier.
-   **Commits:** Ensure your commit messages are descriptive.

## CI/CD

Every Pull Request is automatically checked by GitHub Actions to ensure it meets our quality standards.
