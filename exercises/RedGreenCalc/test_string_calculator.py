import pytest
from string_calculator import StringCalculator


@pytest.fixture
def calc():
    return StringCalculator()


def test_empty_string_returns_zero(calc):
    assert calc.add("") == 0


def test_single_number(calc):
    assert calc.add("1") == 1


def test_two_numbers(calc):
    assert calc.add("1,2") == 3
