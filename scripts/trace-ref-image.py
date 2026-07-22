"""
从参考图提取折线：连通域 = 单条线 → 骨架 → 折点 → 箭头端。
输出 scripts/traced-stage.json
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize

IMG = Path(
    r"C:\Users\Healer\.cursor\projects\d-ctx2026birth-game\assets"
    r"\c__Users_Healer_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"29293dcaf56fcfa1e17574890878aec8_images_image-8b0f369f-845c-42ec-81d5-0411f9e1f398.png"
)
OUT = Path(r"d:\ctx2026birth\game\app-avx47of1d0ch\scripts\traced-stage.json")
GAME_W, GAME_H = 670, 920


def load_binary(path: Path) -> np.ndarray:
    im = Image.open(path).convert("L")
    arr = np.asarray(im)
    # 深色为线
    bw = arr < 128
    return bw


def skeleton_path(skel: np.ndarray) -> list[tuple[int, int]] | None:
    ys, xs = np.where(skel)
    if len(xs) < 3:
        return None
    pts = set(zip(ys.tolist(), xs.tolist()))

    def nbrs(y: int, x: int) -> list[tuple[int, int]]:
        out = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                q = (y + dy, x + dx)
                if q in pts:
                    out.append(q)
        return out

    deg = {p: len(nbrs(*p)) for p in pts}
    ends = [p for p, d in deg.items() if d == 1]
    if len(ends) < 2:
        # 可能成环，取任意两点断开不处理
        return None

    # 选一对端点走最长路径
    best: list[tuple[int, int]] = []
    for start in ends:
        path = [start]
        prev = None
        cur = start
        seen = {start}
        while True:
            opts = [n for n in nbrs(*cur) if n != prev]
            opts = [n for n in opts if n not in seen or n == start]
            # 前进未访问
            nxts = [n for n in nbrs(*cur) if n not in seen]
            if not nxts:
                break
            # 若有多个，优先度=1方向或直线延续
            nxt = nxts[0]
            if len(nxts) > 1 and prev is not None:
                py, px = prev
                cy, cx = cur
                vy, vx = cy - py, cx - px
                scored = []
                for ny, nx in nxts:
                    scored.append(((ny - cy) * vy + (nx - cx) * vx, (ny, nx)))
                scored.sort(reverse=True)
                nxt = scored[0][1]
            path.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
            if len(path) > len(pts) + 5:
                break
        if len(path) > len(best):
            best = path
    return best if len(best) >= 3 else None


def simplify_orthogonal(path: list[tuple[int, int]], tol: int = 2) -> list[tuple[int, int]]:
    """压缩共线点，保留拐角。"""
    if len(path) < 2:
        return path
    out = [path[0]]
    for i in range(1, len(path) - 1):
        y0, x0 = out[-1]
        y1, x1 = path[i]
        y2, x2 = path[i + 1]
        v1 = (y1 - y0, x1 - x0)
        v2 = (y2 - y1, x2 - x1)
        # 方向变化
        def cardinal(v):
            ay, ax = abs(v[0]), abs(v[1])
            if ay >= ax:
                return (-1 if v[0] < 0 else 1, 0) if ay > 0 else (0, 0)
            return (0, -1 if v[1] < 0 else 1)

        c1, c2 = cardinal(v1), cardinal(v2)
        if c1 != c2 and c2 != (0, 0):
            out.append(path[i])
    out.append(path[-1])
    # 合并过近点
    cleaned = [out[0]]
    for p in out[1:]:
        if abs(p[0] - cleaned[-1][0]) + abs(p[1] - cleaned[-1][1]) > tol:
            cleaned.append(p)
    if cleaned[-1] != out[-1]:
        cleaned.append(out[-1])
    return cleaned


def arrow_end_index(comp: np.ndarray, path: list[tuple[int, int]]) -> int:
    """判断哪一端是箭头：端点邻域更‘尖’（沿切线外伸更多）的一端。"""
    h, w = comp.shape

    def tip_score(idx: int) -> float:
        y, x = path[idx]
        if idx == 0:
            y2, x2 = path[min(5, len(path) - 1)]
        else:
            y2, x2 = path[max(0, len(path) - 6)]
        vy, vx = y - y2, x - x2
        n = math.hypot(vy, vx) or 1
        uy, ux = vy / n, vx / n
        # 沿外向探测
        score = 0.0
        for t in range(1, 18):
            yy = int(round(y + uy * t))
            xx = int(round(x + ux * t))
            if 0 <= yy < h and 0 <= xx < w and comp[yy, xx]:
                score += 1.5
            else:
                break
        # 垂直方向宽度（箭头根部较宽）
        py, px = -ux, uy
        width = 0
        for s in range(-8, 9):
            yy = int(round(y + py * s))
            xx = int(round(x + px * s))
            if 0 <= yy < h and 0 <= xx < w and comp[yy, xx]:
                width += 1
        score += max(0, 6 - abs(width - 3)) * 0.2
        return score

    s0, s1 = tip_score(0), tip_score(-1)
    return 0 if s0 >= s1 else -1


def dir_of_head(path: list[tuple[int, int]], head_is_start: bool) -> str:
    if head_is_start:
        a, b = path[0], path[min(4, len(path) - 1)]
        # head 在 start，切线从 b→a
        dy, dx = a[0] - b[0], a[1] - b[1]
    else:
        a, b = path[-1], path[max(0, len(path) - 5)]
        dy, dx = a[0] - b[0], a[1] - b[1]
    if abs(dx) >= abs(dy):
        return "right" if dx > 0 else "left"
    return "down" if dy > 0 else "up"


def extract_lines(bw: np.ndarray) -> list[dict]:
    # 去掉过小噪点
    labeled, n = ndimage.label(bw)
    lines = []
    for i in range(1, n + 1):
        comp = labeled == i
        if comp.sum() < 80:
            continue
        sk = skeletonize(comp)
        path = skeleton_path(sk)
        if not path:
            continue
        path = simplify_orthogonal(path, tol=3)
        if len(path) < 2:
            continue
        head_idx = arrow_end_index(comp, path)
        if head_idx == 0:
            path = list(reversed(path))
        # 现在末点为箭头
        d = dir_of_head(path, head_is_start=False)
        # 再保证末段与 dir 一致：必要时微调末点
        pts = [{"x": int(x), "y": int(y)} for y, x in path]
        lines.append({"id": f"T{len(lines)}", "dir": d, "points": pts, "pixels": int(comp.sum())})
    return lines


def scale_lines(lines: list[dict], src_h: int, src_w: int) -> list[dict]:
    sx = GAME_W / src_w
    sy = GAME_H / src_h
    out = []
    for L in lines:
        pts = []
        for p in L["points"]:
            pts.append({"x": round(p["x"] * sx), "y": round(p["y"] * sy)})
        # 去重相邻
        cleaned = [pts[0]]
        for p in pts[1:]:
            if abs(p["x"] - cleaned[-1]["x"]) + abs(p["y"] - cleaned[-1]["y"]) >= 2:
                cleaned.append(p)
        if len(cleaned) < 2:
            continue
        out.append({"id": L["id"], "dir": L["dir"], "points": cleaned})
    return out


def main():
    bw = load_binary(IMG)
    h, w = bw.shape
    print("image", w, h, "ink", int(bw.sum()))
    raw = extract_lines(bw)
    print("components traced", len(raw))
    scaled = scale_lines(raw, h, w)
    # 按像素量排序稳定 id
    raw_sorted = sorted(raw, key=lambda L: -L["pixels"])
    scaled = scale_lines(raw_sorted, h, w)
    for i, L in enumerate(scaled):
        L["id"] = f"L{i}"

    OUT.write_text(
        json.dumps(
            {
                "width": GAME_W,
                "height": GAME_H,
                "lines": scaled,
                "count": len(scaled),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf8",
    )
    print("wrote", OUT, "lines", len(scaled))
    lens = [len(L["points"]) for L in scaled]
    print("avgPts", round(sum(lens) / max(1, len(lens)), 1), "maxPts", max(lens) if lens else 0)


if __name__ == "__main__":
    main()
