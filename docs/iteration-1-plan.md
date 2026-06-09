# SimRoll — Iteration 1 Plan

## Goal

Create the first backend foundation for SimRoll.

This iteration focuses only on the core Python data models and project structure.

## Scope

Build:

- Python package structure
- Position model
- Transition model
- Grip model
- basic validation
- starter YAML data files
- simple tests

## Out of Scope

Do not build:

- website
- mobile app
- API
- database
- animation
- roll simulator
- AI features

## Technical Requirements

Use:

- Python 3.12
- Pydantic for models
- PyYAML for reading YAML data
- pytest for tests

## Expected Files

```text
simroll/
  models/
    position.py
    transition.py
    grip.py
  data/
    positions.yaml
    transitions.yaml
    grips.yaml
tests/
  test_models.py
pyproject.toml