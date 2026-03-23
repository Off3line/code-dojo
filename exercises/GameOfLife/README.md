# Conway’s Game of Life (Bash Kata)

A terminal-based implementation of Conway’s Game of Life written in **pure Bash**.

This kata focuses on:

* Translating rules into executable logic
* Working with grid-based algorithms

---

## 🧬 What Is Conway’s Game of Life?

Conway’s Game of Life is a cellular automaton devised by mathematician **John Conway** in 1970.

It is a zero-player game. Once the initial state is defined, the system evolves automatically according to a fixed set of rules.

The game takes place on a 2D grid of cells. Each cell has one of two states:

* `#` → Alive
* `.` → Dead

Each generation is computed based on the previous one.

Read here for more details: [Conway’s Game of Life - Wikipedia](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
---

## 📜 The Rules

For every cell in the grid:

1. **Underpopulation**
   A live cell with fewer than 2 live neighbours dies.

2. **Survival**
   A live cell with 2 or 3 live neighbours lives on.

3. **Overpopulation**
   A live cell with more than 3 live neighbours dies.

4. **Reproduction**
   A dead cell with exactly 3 live neighbours becomes alive.

Neighbours are the 8 surrounding cells (horizontal, vertical, diagonal).

---

## 🗂 Input Format

The game reads a grid from a text file.

Example `grid.txt`:

```
.....
..#..
..#..
..#..
.....
```

* Each line must have the same length.
* Only `#` and `.` are valid characters.
* Empty lines are ignored.
* Size of the grids can variable.

---

## ▶️ Running the Game

After installation (see below):

```bash
./life.sh grid.txt
```

The script will:

* Compute the **next generation**
* Print the result
* Render alive cells in ANSI color (if enabled)

---

## ⚙️ Installation Guide

Most systems already include Bash.

Check your version:

```bash
bash --version
```

Bash 4+ is recommended.

Make the script executable:

```bash
chmod +x life.sh
```

Run:

```bash
./life.sh grid.txt
```

---

## 🎯 Goal of This Kata

1. Create a Bash script that implements the Game of Life rules.
2. Read the initial grid from a file.
3. Output the next generation to the terminal.

Options for enhancement:
* Support multiple generations
* Add color output
* Implement a loop for continuous evolution
* Handle edge wrapping (toroidal grid)
* Add command-line options for configuration
* Adjustable speed of generation updates

---

## 📚 Example Patterns

### Blinker (Oscillator)

Input:

```
.....
..#..
..#..
..#..
.....
```

Next generation:

```
.....
.....
.###.
.....
.....
```

---

### Block (Still Life)

```
##..
##..
....
....
```

This pattern never changes.

---


