#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./life.sh grid.txt
#
# Computes ONE next generation and prints it with a frame

# --- ANSI colors ---
ALIVE="\033[1;32m#\033[0m"
DEAD="."
FRAME="\033[1;34m\033[1m"   # blue bold
RESET="\033[0m"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <grid.txt>" >&2
  exit 1
fi

GRID_FILE="$1"

if [[ ! -f "$GRID_FILE" ]]; then
  echo "Grid file not found: $GRID_FILE" >&2
  exit 1
fi

# --- Read grid ---
GRID=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  GRID+=("$line")
done < "$GRID_FILE"

HEIGHT=${#GRID[@]}
WIDTH=${#GRID[0]}

# --- Validate rectangular grid ---
for row in "${GRID[@]}"; do
  if [[ ${#row} -ne $WIDTH ]]; then
    echo "Error: Grid is not rectangular" >&2
    exit 1
  fi
done

# --- Count live neighbours ---
count_neighbors() {
  local r="$1"
  local c="$2"
  local count=0

  for dr in -1 0 1; do
    for dc in -1 0 1; do
      [[ $dr -eq 0 && $dc -eq 0 ]] && continue
      local nr=$((r + dr))
      local nc=$((c + dc))

      if (( nr >= 0 && nr < HEIGHT && nc >= 0 && nc < WIDTH )); then
        [[ "${GRID[nr]:nc:1}" == "#" ]] && ((count++))
      fi
    done
  done

  echo "$count"
}

# --- Compute next generation ---
next_generation() {
  local new_grid=()

  for ((r=0; r<HEIGHT; r++)); do
    local new_row=""
    for ((c=0; c<WIDTH; c++)); do
      local cell="${GRID[r]:c:1}"
      local neighbors
      neighbors=$(count_neighbors "$r" "$c")

      if [[ "$cell" == "#" ]]; then
        (( neighbors == 2 || neighbors == 3 )) && new_row+="#" || new_row+="."
      else
        (( neighbors == 3 )) && new_row+="#" || new_row+="."
      fi
    done
    new_grid+=("$new_row")
  done

  GRID=("${new_grid[@]}")
}

# --- Render framed output ---
render() {
  local horizontal_border="+$(printf '%*s' "$WIDTH" | tr ' ' '-')+"

  echo -e "${FRAME}Generation 1${RESET}"
  echo -e "${FRAME}${horizontal_border}${RESET}"

  for row in "${GRID[@]}"; do
    local out="|"
    for ((i=0; i<WIDTH; i++)); do
      [[ "${row:i:1}" == "#" ]] && out+="$ALIVE" || out+="$DEAD"
    done
    out+="|"
    echo -e "${FRAME}${out}${RESET}"
  done

  echo -e "${FRAME}${horizontal_border}${RESET}"
}

# --- Run ---
next_generation
render

