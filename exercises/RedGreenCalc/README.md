# String Calculator Kata (Flask)

## Prerequisites

Before starting, make sure you have:

Conda (Miniconda or Anaconda)

Python 3.10+ (installed via Conda)

A terminal / command line

A code editor of your choice

Git vor version control and to submit your results at the end

## Setup Instructions (Conda)
1. Create the environment

```bash  
conda create -n string-calculator python=3.11 
```

2. Activate the environment
```bash
conda activate string-calculator
```

3. Install dependencies
```bash
pip install flask pytest
```
### Running the application

 ```bash
   python app.py
 ```
### Running the test
 ```bash
   pytest -s
 ```
 The -s allows for showing the printout

## Overview
This session is a **pair programming coding dojo** focused on **Test-Driven Development (TDD)**.

You will implement a simple `StringCalculator` in Python.  
A small Flask application provides a visual interface, but **the UI is not the goal** — it exists purely as feedback.

The exercise is intentionally incremental. You are **not expected to finish everything**.

---



## The Task
Implement the following method using TDD:

```python
add(numbers: str) -> int
````

The method receives a string containing numbers and returns their sum.
The exact rules will be introduced step by step during the session.

Examples (eventually):
```
"" → 0
"1" → 1
"1,2" → 3
```
## The Goal
This kata is not about math or string parsing.The real goals are to:
Practice Red → Green → Refactor . Write small, focused tests. Let tests
drive design decisions. Refactor safely and incrementally. Collaborate
effectively in pairs. If your tests are green and your code feels
clearer than before, you are succeeding.


## About the UI

The Flask app and HTML page are provided as visual feedback only.

**Important:**

The UI does not define correctness. Tests define correctness. If the UI
“works” but tests are failing, the solution is wrong. Think of the UI as
a mirror of your tests — nothing more.

## Use of AI Tools

The use of AI tools (ChatGPT, Copilot, etc.) is explicitly encouraged, with clear intent.

✅ Appropriate uses

- Explaining Python syntax

- Explaining error messages or test failures

- Clarifying language or framework concepts

- Asking why something behaves a certain way

- Learning testing or refactoring techniques

🚫 Not appropriate

- Asking AI to implement the solution

- Copy-pasting full method implementations

- Letting AI decide the design or architecture

Rule of thumb:

Use AI like a senior colleague who explains things,
not like someone who writes the code for you.

### Working Agreement

- Work in pairs

- One failing test at a time

- Keep steps small

- Refactor only when tests are green

- Prefer clarity over cleverness

- You do not need to finish all steps to succeed in this exercise.

