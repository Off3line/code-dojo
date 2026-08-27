"""Shared machinery for the Data Munging kata.

Both source files are column-aligned text with junk mixed in: headers,
blank lines, separator rules, and (in weather.dat) a trailing summary
row that looks structurally identical to a real one.

The strategy is to let the row parser do the filtering. A caller supplies
a `parse` function that turns a list of fields into the three values it
cares about; any row the parser chokes on is not a data row.
"""


def number(field):
    """Parse a numeric field, ignoring a trailing record marker."""
    return float(field.rstrip("*"))


def data_rows(path, parse):
    """Yield parse(fields) for every line of `path` that parses cleanly."""
    with open(path) as handle:
        for line in handle:
            try:
                yield parse(line.split())
            except (IndexError, ValueError):
                continue


def smallest_spread(path, parse):
    """Return the label of the row whose two values are closest together."""
    rows = data_rows(path, parse)
    return min(rows, key=lambda row: abs(row[1] - row[2]))[0]
