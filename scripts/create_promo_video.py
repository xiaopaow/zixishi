from __future__ import annotations

import math
import os
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)
W, H, FPS, DURATION = 720, 1280, 24, 30


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


FONT_XL = font(72, True)
FONT_L = font(48, True)
FONT_M = font(31, False)
FONT_S = font(24, False)
FONT_XS = font(19, False)


def scene_image(name: str) -> Image.Image:
    for suffix in ("-1280.webp", "-poster.webp", ".webp"):
        path = ROOT / "public" / "scenes" / f"{name}{suffix}"
        if path.exists():
            return Image.open(path).convert("RGB")
    raise FileNotFoundError(name)


SCENES = [
    ("bamboo-dawn", "晨雾竹院"),
    ("rain-study", "江南雨夜书房"),
    ("seaside-dusk", "海边黄昏工作室"),
    ("city-loft", "深夜城市阁楼"),
    ("night-train", "夜行列车"),
    ("temple-ginkgo", "古寺银杏书阁"),
]
SCENE_IMAGES = {name: scene_image(name) for name, _ in SCENES}


def cover_frame(image: Image.Image, t: float, seed: int) -> Image.Image:
    iw, ih = image.size
    scale = max(W / iw, H / ih) * (1.03 + 0.018 * math.sin(t * 0.45 + seed))
    resized = image.resize((round(iw * scale), round(ih * scale)), Image.Resampling.LANCZOS)
    rw, rh = resized.size
    max_x, max_y = max(0, rw - W), max(0, rh - H)
    x = int(max_x * (0.5 + 0.43 * math.sin(t * 0.08 + seed)))
    y = int(max_y * (0.5 + 0.12 * math.sin(t * 0.11 + seed * 1.7)))
    return resized.crop((x, y, x + W, y + H))


def text_center(draw: ImageDraw.ImageDraw, y: int, value: str, typeface: ImageFont.FreeTypeFont, fill=(255, 252, 242, 255)):
    box = draw.textbbox((0, 0), value, font=typeface)
    draw.text(((W - (box[2] - box[0])) / 2, y), value, font=typeface, fill=fill)


def glass(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int = 28, fill=(17, 33, 34, 168), outline=(255, 255, 255, 62)):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)


def wrap_text(value: str, typeface: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    dummy = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for char in value:
        candidate = current + char
        if dummy.textbbox((0, 0), candidate, font=typeface)[2] > max_width and current:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def scene_particles(layer: Image.Image, t: float, seed: int, count: int = 26):
    draw = ImageDraw.Draw(layer)
    rng = np.random.default_rng(seed)
    particles = rng.random((count, 4))
    for px, py, speed, size in particles:
        x = int((px * W + math.sin(t * 0.2 + py * 10) * 22) % W)
        y = int((py * H + (t * (9 + speed * 15) * 18)) % H)
        r = max(1, int(1 + size * 3))
        alpha = int(28 + 58 * (0.5 + 0.5 * math.sin(t * 0.8 + px * 11)))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(244, 219, 160, alpha))


def rain_lines(layer: Image.Image, t: float):
    draw = ImageDraw.Draw(layer)
    for i in range(34):
        x = (i * 83 + int(t * 48)) % (W + 120) - 60
        y = (i * 57 + int(t * 190)) % (H + 140) - 70
        draw.line((x, y, x - 11, y + 54), fill=(191, 218, 230, 32), width=2)


def vignette(frame: Image.Image) -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)
    for inset in range(0, 250, 10):
        alpha = int(120 * (1 - inset / 250) ** 2)
        draw.rectangle((inset, inset, W - inset, H - inset), outline=alpha, width=10)
    shade = Image.new("RGBA", (W, H), (4, 12, 16, 0))
    shade.putalpha(mask)
    return Image.alpha_composite(frame.convert("RGBA"), shade)


def draw_frame(t: float) -> np.ndarray:
    section = min(5, int(t / 5))
    name, label = SCENES[section]
    frame = cover_frame(SCENE_IMAGES[name], t - section * 5, section).convert("RGBA")

    veil = Image.new("RGBA", (W, H), (7, 24, 25, 52))
    ImageDraw.Draw(veil).rectangle((0, 0, W, H // 2), fill=(7, 26, 30, 70))
    ImageDraw.Draw(veil).rectangle((0, H * 0.68, W, H), fill=(4, 13, 17, 118))
    frame = Image.alpha_composite(frame, veil)
    particles = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    scene_particles(particles, t, 17 + section * 19, 22 if section != 1 else 10)
    if section == 1:
        rain_lines(particles, t)
    frame = Image.alpha_composite(frame, particles)
    frame = vignette(frame)

    ui = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ui)
    draw.rounded_rectangle((34, 38, 230, 84), 23, fill=(13, 42, 42, 165), outline=(255, 255, 255, 52), width=1)
    draw.text((56, 49), "栖时  ·  东方疗愈自习室", font=FONT_XS, fill=(245, 237, 213, 230))
    draw.text((44, H - 72), "一段专注，不必喧哗。", font=FONT_S, fill=(242, 238, 224, 190))
    draw.line((44, H - 36, W - 44, H - 36), fill=(255, 255, 255, 65), width=2)
    progress = (t % 5) / 5
    draw.line((44, H - 36, 44 + int((W - 88) * (t / DURATION)), H - 36), fill=(224, 187, 114, 220), width=3)

    if section == 0:
        draw.text((52, 320), "给自己一段", font=FONT_L, fill=(255, 250, 236, 255))
        draw.text((52, 380), "安静的时间", font=FONT_XL, fill=(255, 250, 236, 255))
        draw.text((56, 492), "场景、声音、计时，都由你决定。", font=FONT_M, fill=(244, 240, 228, 225))
    elif section == 1:
        glass(draw, (42, 308, W - 42, 664))
        draw.text((75, 354), "场景 01", font=FONT_XS, fill=(232, 203, 142, 245))
        draw.text((75, 396), label, font=FONT_L, fill=(255, 250, 236, 255))
        draw.text((75, 466), "雨声 · 暖灯 · 一盏茶", font=FONT_M, fill=(241, 239, 225, 230))
        draw.text((75, 566), "25:00", font=font(76, False), fill=(255, 250, 236, 255))
        draw.text((75, 635), "开始一段不被打扰的专注", font=FONT_S, fill=(241, 229, 201, 220))
    elif section == 2:
        text_center(draw, 300, "把环境调成适合你的样子", FONT_L)
        glass(draw, (54, 470, W - 54, 736))
        chips = [("海浪", 86), ("风声", 260), ("钢琴", 434)]
        for label_text, x in chips:
            draw.rounded_rectangle((x, 532, x + 144, 598), 30, fill=(236, 214, 166, 70), outline=(255, 244, 220, 120), width=1)
            draw.text((x + 39, 551), label_text, font=FONT_S, fill=(255, 249, 231, 255))
        draw.text((86, 650), "每一种声音，都有独立音量。", font=FONT_M, fill=(245, 241, 229, 220))
    elif section == 3:
        glass(draw, (43, 292, W - 43, 710))
        draw.text((75, 340), "专注进行中", font=FONT_S, fill=(217, 192, 135, 240))
        timer = max(0, 25 * 60 - int((t - 15) * 60))
        draw.text((75, 388), f"{timer // 60:02d}:{timer % 60:02d}", font=font(88, False), fill=(255, 250, 236, 255))
        draw.text((78, 512), "今天只做这一件事。", font=FONT_M, fill=(242, 238, 224, 230))
        draw.line((78, 604, 642, 604), fill=(255, 255, 255, 80), width=3)
        draw.line((78, 604, 78 + int(564 * ((t - 15) / 5)), 604), fill=(225, 187, 112, 240), width=4)
        draw.text((78, 650), "12 人正在同一场景里专注", font=FONT_S, fill=(225, 236, 215, 220))
    elif section == 4:
        text_center(draw, 264, "每天，都留下自己的足迹", FONT_L)
        cards = [("今日专注", "01:45", 58, 438), ("连续专注", "7 天", 382, 438), ("完成任务", "12 项", 58, 620), ("累计时长", "36h", 382, 620)]
        for title, value, x, y in cards:
            glass(draw, (x, y, x + 280, y + 126), 23, fill=(15, 35, 35, 175))
            draw.text((x + 22, y + 20), title, font=FONT_XS, fill=(226, 221, 206, 210))
            draw.text((x + 22, y + 53), value, font=font(42, True), fill=(255, 248, 231, 255))
    else:
        text_center(draw, 320, "坐下来，", FONT_L)
        text_center(draw, 380, "把这一刻留给真正重要的事。", FONT_L)
        draw.rounded_rectangle((92, 554, W - 92, 628), 38, fill=(239, 211, 153, 225))
        text_center(draw, 574, "进入栖时，开始专注", FONT_S, fill=(25, 57, 52, 255))
        text_center(draw, 670, "栖时 · 东方疗愈自习室", FONT_M, fill=(255, 246, 225, 238))
        text_center(draw, 730, "让每一段认真，都有一个安静的空间。", FONT_S, fill=(244, 238, 222, 218))

    frame = Image.alpha_composite(frame, ui)
    return np.asarray(frame.convert("RGB"), dtype=np.uint8)


def write_audio(path: Path):
    sample_rate = 44100
    n = sample_rate * DURATION
    time = np.arange(n, dtype=np.float32) / sample_rate
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 1, n).astype(np.float32)
    smooth = np.zeros_like(noise)
    for i in range(1, n):
        smooth[i] = 0.995 * smooth[i - 1] + 0.005 * noise[i]
    pad = 0.045 * np.sin(2 * np.pi * 196.0 * time) + 0.025 * np.sin(2 * np.pi * 246.94 * time)
    rain = 0.018 * noise + 0.045 * smooth
    signal = pad + rain
    for start in (0.25, 5.0, 10.0, 15.0, 20.0, 29.25):
        index = int(start * sample_rate)
        length = min(int(1.5 * sample_rate), n - index)
        local = np.arange(length, dtype=np.float32) / sample_rate
        signal[index : index + length] += 0.17 * np.sin(2 * np.pi * 784 * local) * np.exp(-3.3 * local)
    fade = np.minimum(1, time * 2.0) * np.minimum(1, (DURATION - time) * 2.0)
    signal = np.clip(signal * fade, -0.38, 0.38)
    stereo = np.stack((signal, signal * 0.96), axis=1)
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())


def main():
    silent = OUT / "qishi-douyin-promo-silent.mp4"
    audio = OUT / "qishi-douyin-promo-audio.wav"
    final = OUT / "qishi-douyin-promo-30s-vertical.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    writer = imageio_ffmpeg.write_frames(
        str(silent),
        (W, H),
        fps=FPS,
        codec="libx264",
        pix_fmt_in="rgb24",
        pix_fmt_out="yuv420p",
        macro_block_size=1,
        output_params=["-crf", "20", "-preset", "medium", "-movflags", "+faststart"],
    )
    writer.send(None)
    for frame_number in range(DURATION * FPS):
        writer.send(draw_frame(frame_number / FPS))
    writer.close()
    write_audio(audio)
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(silent),
            "-i",
            str(audio),
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(final),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    silent.unlink(missing_ok=True)
    audio.unlink(missing_ok=True)
    print(final)


if __name__ == "__main__":
    main()
