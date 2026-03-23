#!/usr/bin/env bash

set -euo pipefail

# --- Colors ---
ALIVE="\033[1;32m#\033[0m"
DEAD="."

# --- Input Grid ---
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <grid.txt>"
  exit 1
fi

grid_file="$1"
readarray -t GRID < "$grid_file"

HEIGHT=${#GRID[@]}
WIDTH=${#GRID[0]}

# --- Count live neighbors for a cell ---
count_neighbors() {
  local row="$1"
  local col="$2"
  local count=0

  for dr in -1 0 1; do
    for dc in -1 0 1; do
      [[ $dr -eq 0 && $dc -eq 0 ]] && continue
      local r=$((row + dr))
      local c=$((col + dc))
      if (( r >= 0 && r < HEIGHT &&  c >= 0 && c < WIDTH )); then
        [[ "${GRID[r]:c:1}" == "#" ]] && ((count++))
      fi
    done
  done

  echo "$count"
}

# --- Compute next generation ---
next_generation() {
  local new_grid=()

  for ((r=0; r<HEIGHT; r++)); do
    local line=""
    for ((c=0; c<WIDTH; c++)); do
      local cell="${GRID[r]:c:1}"
      local neighbors
      neighbors=$(count_neighbors "$r" "$c")

      if [[ "$cell" == "#" ]]; then
        if (( neighbors < 2 || neighbors > 3 )); then
          line+="."
        else
          line+="#"
        fi
      else
        if (( neighbors == 3 )); then
          line+="#"
        else
          line+="."
        fi
      fi
    done
    new_grid+=("$line")
  done

  GRID=("${new_grid[@]}")
}

# --- Display grid with colors ---
display_grid() {
  for row in "${GRID[@]}"; do
    local line=""
    for ((i=0; i<WIDTH; i++)); do
      [[ "${row:i:1}" == "#" ]] && line+="$ALIVE" || line+="$DEAD"
    done
    echo -e "$line"
  done
}

# --- Animate generations ---
GENERATIONS=100
SLEEP_TIME=0.1

for gen in $(seq 1 $GENERATIONS); do
  clear
  echo "Generation $gen:"
  display_grid
  sleep "$SLEEP_TIME"
  next_generation
done

