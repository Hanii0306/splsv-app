"""Python port of the SPLSV equation engine (app/src/engine/*.js).

Exact rational arithmetic (fractions.Fraction), the same textbook step order as the app
(fractions → brackets → collect x → remove constant → divide), and seeded generators per level.
Used to print pretest/posttest worksheets with worked answer keys (see worksheet.py).
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass
from fractions import Fraction
from math import lcm
from typing import Literal, Union

Rel = Literal["=", "<", ">", "≤", "≥"]
_REL_RE = re.compile(r"(<=|>=|≤|≥|<|>|=)")
_NORM_REL = {"<=": "≤", ">=": "≥", "≤": "≤", "≥": "≥", "<": "<", ">": ">", "=": "="}
FLIP = {"<": ">", ">": "<", "≤": "≥", "≥": "≤", "=": "="}


class ParseError(ValueError):
    """Raised for input that is not a linear (in)equation in x."""


# ---------------------------------------------------------------- tokenizer + parser
def _tokenize(src: str) -> list[tuple[str, Fraction | None]]:
    s = src.replace("−", "-").replace("–", "-").replace("×", "*").replace("·", "*").replace("÷", "/").replace(":", "/")
    out: list[tuple[str, Fraction | None]] = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == " ":
            i += 1
            continue
        if c.isdigit() or c == ".":
            j = i
            while j < len(s) and (s[j].isdigit() or s[j] == "."):
                j += 1
            try:
                out.append(("num", Fraction(s[i:j])))
            except ValueError as exc:
                raise ParseError(f"Angka tidak valid: {s[i:j]}") from exc
            i = j
            continue
        if c in "xX":
            out.append(("x", None))
        elif c in "+-*/()":
            out.append((c, None))
        else:
            raise ParseError(f'Simbol tidak dikenal: "{c}"')
        i += 1
    return out


Linear = tuple[Fraction, Fraction]  # a·x + b


def _parse_side(text: str) -> tuple:
    toks = _tokenize(text)
    pos = 0

    def peek():
        return toks[pos] if pos < len(toks) else None

    def take(kind=None):
        nonlocal pos
        tok = peek()
        if tok is None or (kind and tok[0] != kind):
            raise ParseError(f'Diharapkan "{kind}"')
        pos += 1
        return tok

    def expr():
        node = term()
        while peek() and peek()[0] in "+-":
            op = take()[0]
            node = ("add" if op == "+" else "sub", node, term())
        return node

    def term():
        node = unary()
        while True:
            p = peek()
            if p and p[0] in "*/":
                take()
                node = ("mul" if p[0] == "*" else "div", node, unary())
            elif p and p[0] in ("x", "(", "num"):
                node = ("mul", node, unary())  # implicit: 2x, 3(x+1), 1/2(x+3)
            else:
                return node

    def unary():
        p = peek()
        if p and p[0] == "-":
            take()
            return ("neg", unary())
        if p and p[0] == "+":
            take()
            return unary()
        return primary()

    def primary():
        p = peek()
        if p is None:
            raise ParseError("Ekspresi tidak lengkap")
        if p[0] == "num":
            take()
            return ("num", p[1])
        if p[0] == "x":
            take()
            return ("x",)
        if p[0] == "(":
            take()
            e = expr()
            take(")")
            return ("group", e)
        raise ParseError(f'Tidak terduga: "{p[0]}"')

    if not toks:
        raise ParseError("Ruas kosong")
    node = expr()
    if pos != len(toks):
        raise ParseError("Ada simbol berlebih")
    return node


def _linearize(node: tuple) -> Linear:
    kind = node[0]
    if kind == "num":
        return Fraction(0), node[1]
    if kind == "x":
        return Fraction(1), Fraction(0)
    if kind == "group":
        return _linearize(node[1])
    if kind == "neg":
        a, b = _linearize(node[1])
        return -a, -b
    if kind in ("add", "sub"):
        (a1, b1), (a2, b2) = _linearize(node[1]), _linearize(node[2])
        return (a1 + a2, b1 + b2) if kind == "add" else (a1 - a2, b1 - b2)
    if kind == "mul":
        (a1, b1), (a2, b2) = _linearize(node[1]), _linearize(node[2])
        if a1 and a2:
            raise ParseError("Bukan persamaan linear (x dikali x)")
        k, (a, b) = (b1, (a2, b2)) if a1 == 0 else (b2, (a1, b1))
        return k * a, k * b
    if kind == "div":
        (a1, b1), (a2, b2) = _linearize(node[1]), _linearize(node[2])
        if a2:
            raise ParseError("Pembagian oleh x tidak didukung")
        if b2 == 0:
            raise ParseError("Pembagian dengan nol")
        return a1 / b2, b1 / b2
    raise ParseError("AST tidak dikenal")


# ---------------------------------------------------------------- formatting
def _frac(f: Fraction) -> str:
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"


def _coef(a: Fraction) -> str:
    if a == 1:
        return "x"
    if a == -1:
        return "-x"
    if a.denominator == 1:
        return f"{a.numerator}x"
    if abs(a.numerator) == 1:
        return f"{'-' if a < 0 else ''}x/{a.denominator}"
    return f"{'-' if a < 0 else ''}({abs(a.numerator)}/{a.denominator})x"


def format_linear(a: Fraction, b: Fraction) -> str:
    """Canonical text for a·x + b, e.g. '2x + 5', '-x - 3', 'x/2 + 1', '7'."""
    parts = []
    if a:
        parts.append(_coef(a))
    if b:
        parts.append(_frac(b) if not parts else f"{'-' if b < 0 else '+'} {_frac(abs(b))}")
    return " ".join(parts) or "0"


def pretty(text: str) -> str:
    """Typographic minus for printing."""
    return re.sub(r"(^|[\s(])-", r"\1−", text).replace(" - ", " − ")


# ---------------------------------------------------------------- equations
@dataclass(frozen=True)
class Side:
    text: str
    a: Fraction
    b: Fraction

    @property
    def structured(self) -> bool:
        squash = lambda t: re.sub(r"\s+", "", t).replace("−", "-")  # noqa: E731
        return squash(self.text) != squash(format_linear(self.a, self.b))

    @property
    def has_fraction(self) -> bool:
        return self.a.denominator != 1 or self.b.denominator != 1


def _side(text: str) -> Side:
    t = text.strip()
    a, b = _linearize(_parse_side(t))
    return Side(t, a, b)


def _side_from(a: Fraction, b: Fraction) -> Side:
    return Side(format_linear(a, b), a, b)


@dataclass(frozen=True)
class Equation:
    left: Side
    right: Side
    rel: Rel = "="

    def __str__(self) -> str:
        return f"{self.left.text} {self.rel} {self.right.text}"


def parse(text: str) -> Equation:
    parts = _REL_RE.split(text)
    if len(parts) != 3:
        raise ParseError("Harus ada tepat satu tanda =, <, >, ≤, atau ≥")
    return Equation(_side(parts[0]), _side(parts[2]), _NORM_REL[parts[1]])


Solution = Union[Fraction, Literal["none", "all"]]


def solve(eq: Equation) -> Solution:
    """x for an equation (or the boundary value of an inequality)."""
    A = eq.left.a - eq.right.a
    B = eq.right.b - eq.left.b
    if A == 0:
        return "all" if B == 0 else "none"
    return B / A


def is_solved(eq: Equation) -> bool:
    unit = lambda s: s.a == 1 and s.b == 0 and not s.structured  # noqa: E731
    const = lambda s: s.a == 0 and not s.structured  # noqa: E731
    return (unit(eq.left) and const(eq.right)) or (unit(eq.right) and const(eq.left))


# ---------------------------------------------------------------- operations (same order as the app)
Op = tuple  # ('add'|'sub', (a, b)) | ('mul'|'div', k) | ('simplify',)


def _remove(a: Fraction, b: Fraction) -> Op:
    negative = a < 0 or (a == 0 and b < 0)
    return ("add", (-a, -b)) if negative else ("sub", (a, b))


def best_op(eq: Equation) -> Op | None:
    L, R = eq.left, eq.right
    if L.has_fraction or R.has_fraction:
        k = 1
        for f in (L.a, L.b, R.a, R.b):
            k = lcm(k, f.denominator)
        return ("mul", Fraction(k))
    if L.structured or R.structured:
        return ("simplify",)
    lx, rx = L.a != 0, R.a != 0
    if lx and rx:
        src = R if L.a >= R.a else L  # keep the x-coefficient positive
        return _remove(src.a, Fraction(0))
    if not lx and not rx:
        return None
    s = L if lx else R
    if s.b:
        return _remove(Fraction(0), s.b)
    if s.a != 1:
        return ("div", s.a)
    return None


def apply(eq: Equation, op: Op) -> Equation:
    def f(s: Side) -> tuple[Fraction, Fraction]:
        kind = op[0]
        if kind == "add":
            return s.a + op[1][0], s.b + op[1][1]
        if kind == "sub":
            return s.a - op[1][0], s.b - op[1][1]
        if kind == "mul":
            return s.a * op[1], s.b * op[1]
        if kind == "div":
            return s.a / op[1], s.b / op[1]
        return s.a, s.b

    rel = eq.rel
    if rel != "=" and op[0] in ("mul", "div") and op[1] < 0:
        rel = FLIP[rel]
    return Equation(_side_from(*f(eq.left)), _side_from(*f(eq.right)), rel)


def op_label(op: Op) -> str:
    k = lambda v: f"({_frac(v)})" if v < 0 else _frac(v)  # noqa: E731
    kind = op[0]
    if kind == "add":
        return f"+{format_linear(*op[1])} kedua ruas"
    if kind == "sub":
        return f"−{format_linear(*op[1])} kedua ruas"
    if kind == "mul":
        return f"×{k(op[1])} kedua ruas"
    if kind == "div":
        return f"÷{k(op[1])} kedua ruas"
    return "Jabarkan / sederhanakan"


def solution_steps(text: str, max_steps: int = 8) -> list[tuple[str, str | None]]:
    """[(equation_text, operation_label_or_None), ...] ending at x = c."""
    eq = parse(text)
    steps: list[tuple[str, str | None]] = [(str(eq), None)]
    for _ in range(max_steps):
        if is_solved(eq):
            break
        op = best_op(eq)
        if op is None:
            break
        eq = apply(eq, op)
        steps.append((str(eq), op_label(op)))
    return steps


# ---------------------------------------------------------------- generators (one integer solution)
def _term(c: int, first: bool = False) -> str:
    if c == 1:
        return "x" if first else "+ x"
    if c == -1:
        return "-x" if first else "- x"
    if first:
        return f"{c}x"
    return f"- {-c}x" if c < 0 else f"+ {c}x"


def _cst(b: int, first: bool = False) -> str:
    return str(b) if first else (f"- {-b}" if b < 0 else f"+ {b}")


def _nz(r: random.Random, lo: int, hi: int) -> int:
    v = 0
    while v == 0:
        v = r.randint(lo, hi)
    return v


def _sign(r: random.Random) -> int:
    return -1 if r.random() < 0.5 else 1


def _build(level: str, r: random.Random) -> str:
    if level == "L0":
        x, a = r.randint(1, 9), r.randint(1, 9)
        return f"x + {a} = {x + a}"
    if level == "L1":
        x, a = _nz(r, -9, 12), _nz(r, -12, 12)
        return f"x {_cst(a)} = {x + a}"
    if level == "L2":
        x, a = _nz(r, -10, 10), _sign(r) * r.randint(2, 9)
        return f"{a}x = {a * x}"
    if level == "L3":
        x, a, b = _nz(r, -9, 9), _sign(r) * r.randint(2, 7), _nz(r, -15, 15)
        return f"{_term(a, True)} {_cst(b)} = {a * x + b}"
    if level == "L4":
        x, a = _nz(r, -8, 8), _nz(r, -6, 9)
        c = _nz(r, -6, 9)
        while c == a:
            c = _nz(r, -6, 9)
        b = r.randint(-12, 12)
        d = a * x + b - c * x
        left = _term(a, True) if b == 0 else f"{_term(a, True)} {_cst(b)}"
        right = _term(c, True) if d == 0 else f"{_term(c, True)} {_cst(d)}"
        return f"{left} = {right}"
    if level == "L5":
        x, k, m = _nz(r, -8, 8), _sign(r) * r.randint(2, 6), _nz(r, -7, 7)
        return f"{k}(x {_cst(m)}) = {k * (x + m)}"
    if level == "L6":
        q = r.randint(2, 5)
        if r.random() < 0.5:
            x, b = q * _nz(r, -6, 6), _nz(r, -9, 9)
            return f"x/{q} {_cst(b)} = {x // q + b}"
        m = _nz(r, -6, 6)
        x = q * _nz(r, -5, 5) - m
        return f"1/{q}(x {_cst(m)}) = {(x + m) // q}"
    raise ValueError(f"Level tidak dikenal: {level}")


LEVELS = ("L0", "L1", "L2", "L3", "L4", "L5", "L6")


def gen_equation(level: str, seed: int | str) -> str:
    """Seeded equation for a level with an integer solution (same seed → same item)."""
    r = random.Random(f"{level}:{seed}")
    for _ in range(50):
        text = _build(level, r)
        sol = solve(parse(text))
        if isinstance(sol, Fraction) and sol.denominator == 1:
            return text
    raise RuntimeError("generator gagal")
