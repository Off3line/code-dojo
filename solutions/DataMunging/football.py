"""Part Two: the team with the smallest difference in goals for and against."""

from munge import number, smallest_spread


def parse(fields):
    # Fields are: rank, name, P, W, L, D, F, '-', A, Pts. The literal dash
    # between F and A is why 'against' sits two places along, not one.
    position, name = fields[0], fields[1]
    if not position.rstrip(".").isdigit():
        raise ValueError(position)
    return name, number(fields[6]), number(fields[8])


if __name__ == "__main__":
    print(smallest_spread("football.txt", parse))
