"""Part One: the day in June 2002 with the smallest temperature spread."""

from munge import number, smallest_spread


def parse(fields):
    # int() on the day column is what rejects the header and the trailing
    # 'mo' average row; both would otherwise parse as perfectly good data.
    return int(fields[0]), number(fields[1]), number(fields[2])


if __name__ == "__main__":
    print(smallest_spread("weather.txt", parse))
