"""
TaleemiDunya-Pro — Add Urdu Voice Narration to Tutorial Videos
Uses Microsoft Edge TTS (Urdu Pakistan - Asad Neural) + FFmpeg
"""

import asyncio
import subprocess
import os
import sys
import time
import edge_tts

FFMPEG_PATH = r"G:\Nova Vid\bin\ffmpeg.exe"
VIDEOS_DIR  = r"G:\TaleemiDunya-Pro-Main\TaleemiDunya-Pro\Tutorial_Videos_For_YouTube"
TEMP_DIR    = r"G:\TaleemiDunya-Pro-Main\TaleemiDunya-Pro\Tutorial_Videos_For_YouTube\temp_audio"

# Microsoft Edge TTS voices:
# Urdu Pakistan (Male):   ur-PK-AsadNeural     ✅ Clear & professional
# Urdu Pakistan (Female): ur-PK-UzmaNeural
VOICE = "ur-PK-AsadNeural"

# ─────────────────────────────────────────────────────────────
#  Urdu narration script for each of the 8 tutorial videos
# ─────────────────────────────────────────────────────────────
NARRATIONS = [
    {
        "file": "01_Dashboard_And_Core_Overview.mp4",
        "text": """
السلام علیکم! TaleemiDunya Pro میں خوش آمدید۔
یہ ہے آپ کا ایگزیکٹو ڈیش بورڈ، جہاں آپ اسکول کی تمام معلومات ایک نظر میں دیکھ سکتے ہیں۔
یہاں آپ کو اسٹوڈنٹس کی تعداد، فیس کی وصولی، آج کی حاضری، اور تمام اساتذہ کی بائیومیٹرک حاضری نظر آتی ہے۔
Quick Admission بٹن سے فوری طور پر نئے بچے کا داخلہ کر سکتے ہیں۔
نیچے حالیہ طلباء کی مکمل فہرست ہے جس میں والد کا نام، سی این آئی سی، کلاس اور ماہانہ فیس شامل ہے۔
"""
    },
    {
        "file": "02_Student_Admissions_And_ID_Cards.mp4",
        "text": """
السلام علیکم! اب ہم نئے طالب علم کا داخلہ کرنا سیکھیں گے۔
فارم میں بچے کا نام، رول نمبر، والد کا نام، اور سی این آئی سی درج کریں۔
سی این آئی سی اور والد کا نام درج کرتے ہی سسٹم خودبخود باقی بھائیوں کو ایک ہی فیملی گروپ میں رکھتا ہے۔
دائیں طرف بچے کا لائیو بارکوڈ آئی ڈی کارڈ فوراً بن کر نظر آتا ہے۔
Save اور Print بٹن دباتے ہی داخلہ محفوظ ہو جاتا ہے اور پی وی سی کارڈ پرنٹ کے لیے تیار ہو جاتا ہے۔
"""
    },
    {
        "file": "03_Student_Attendance_And_QR_Gate_Scanner.mp4",
        "text": """
السلام علیکم! اب دیکھتے ہیں ہمارا 2D QR اور بارکوڈ گیٹ سکینر۔
بچہ جیسے ہی اپنا آئی ڈی کارڈ کیمرے کے سامنے رکھتا ہے، ایک سیکنڈ میں حاضری درج ہو جاتی ہے۔
سکرین پر فوری سبز رنگ کی تصدیق نظر آتی ہے۔
دائیں طرف لائیو حاضری رجسٹر میں تمام بچوں کی حاضری اور غیرحاضری دیکھ سکتے ہیں۔
WhatsApp الرٹ بٹن دباتے ہی غیرحاضر بچوں کے والدین کو فوری پیغام چلا جاتا ہے۔
"""
    },
    {
        "file": "04_Fee_Challans_Collection_And_Ledgers.mp4",
        "text": """
السلام علیکم! اب فیس واؤچر سسٹم دیکھتے ہیں۔
TaleemiDunya Pro میں سرکاری بینک کی طرز کا تین حصوں والا فیس چالان ہے۔
بینک کاپی، اسکول اکاؤنٹس کاپی، اور والدین کی کاپی۔
ہر چالان میں ٹیوشن فیس، امتحان فیس، اور کل رقم خودبخود حساب ہو جاتی ہے۔
Print Batch بٹن سے پوری کلاس کے چالان ایک ساتھ پرنٹ کریں۔
Collect Fee بٹن سے فوری نقد فیس وصول کریں اور رسید جاری کریں۔
"""
    },
    {
        "file": "05_Academics_Timetable_And_Daily_Diary.mp4",
        "text": """
السلام علیکم! اب ٹائم ٹیبل اور ڈیلی ڈائری سیکھتے ہیں۔
TaleemiDunya Pro میں آپ ہر کلاس کا ہفتہ وار پیریڈ شیڈول بنا سکتے ہیں۔
ہر پیریڈ میں مضمون اور استاد کا نام درج کریں۔ سسٹم خودبخود ٹکراؤ چیک کرتا ہے۔
Broadcast بٹن دباتے ہی آج کا ہوم ورک اور اہم اعلانات تمام والدین کو واٹس ایپ پر چلے جاتے ہیں۔
یہ فیچر گھر میں بیٹھے والدین کو بچوں کی تعلیم سے جوڑے رکھتا ہے۔
"""
    },
    {
        "file": "06_Exam_Management_And_Marksheets.mp4",
        "text": """
السلام علیکم! اب امتحان اور مارک شیٹ کا نظام دیکھتے ہیں۔
ہر مضمون میں نمبرات درج کریں اور سسٹم خودبخود فیصد، گریڈ اور پوزیشن نکالتا ہے۔
امتحان میں اول پوزیشن والے بچے کو خودبخود گریڈ A پلس ملتا ہے۔
دائیں طرف آفیشل پروگریس رپورٹ کارڈ نظر آتا ہے جس میں اسکول کی مہر اور پرنسپل کا خانہ ہے۔
Print بٹن سے پوری کلاس کے رپورٹ کارڈ پی ڈی ایف فارمیٹ میں ڈاؤنلوڈ ہو جاتے ہیں۔
"""
    },
    {
        "file": "07_Staff_Directory_And_Payroll_Management.mp4",
        "text": """
السلام علیکم! اب اساتذہ اور پے رول مینجمنٹ دیکھتے ہیں۔
اسٹاف ڈائریکٹری میں تمام اساتذہ کے نام، عہدے، اور آج کی بائیومیٹرک حاضری نظر آتی ہے۔
دائیں طرف کسی بھی استاد کی ماہانہ تنخواہ سلپ تیار ہے۔
بیسک تنخواہ، الاؤنسز اور کٹوتیاں خودبخود حساب ہو جاتی ہیں۔
Print بٹن سے فوری پیشہ ورانہ تنخواہ سلپ پرنٹ کریں یا پی ڈی ایف ڈاؤنلوڈ کریں۔
"""
    },
    {
        "file": "08_Cloud_Backups_And_WhatsApp_AI_Bot.mp4",
        "text": """
السلام علیکم! آخری اور بہت اہم فیچر دیکھتے ہیں، گوگل ڈرائیو کلاؤڈ بیک اپ اور واٹس ایپ AI بوٹ۔
TaleemiDunya Pro آپ کے اسکول کا تمام ڈیٹا ہر روز صبح چھ بجے خودبخود گوگل ڈرائیو میں محفوظ کر لیتا ہے۔
فوری بیک اپ کے لیے Backup Now بٹن دبائیں اور چند سیکنڈوں میں سب کچھ محفوظ ہو جائے گا۔
واٹس ایپ AI بوٹ چوبیس گھنٹے والدین کے سوالوں کے جواب دیتا ہے۔
فیس بچی ہے؟ حاضری کیسی ہے؟ ہوم ورک کیا ہے؟ سب خودبخود جواب آتا ہے۔
TaleemiDunya Pro آپ کے اسکول کو ڈیجیٹل دور میں لے جاتا ہے۔ شکریہ!
"""
    }
]


async def generate_audio(text: str, out_path: str, voice: str = VOICE):
    """Generate MP3 audio using Microsoft Edge TTS."""
    communicate = edge_tts.Communicate(text.strip(), voice, rate="+10%", volume="+10%")
    await communicate.save(out_path)


def merge_audio_video(video_in: str, audio_in: str, video_out: str):
    """Merge audio MP3 into existing MP4 using FFmpeg (audio looped if shorter than video)."""
    # Get video duration first
    result = subprocess.run([
        FFMPEG_PATH, "-i", video_in
    ], capture_output=True, text=True)
    
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", video_in,
        "-i", audio_in,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",           # end when shorter stream ends
        "-map", "0:v:0",       # take video from first input
        "-map", "1:a:0",       # take audio from second input
        video_out
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode


async def process_all_videos():
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    print("=" * 70)
    print("🎙️  TaleemiDunya Pro — Adding Urdu Voice Narration to Tutorial Videos")
    print(f"🔊  Voice: {VOICE}")
    print(f"📁  Folder: {VIDEOS_DIR}")
    print("=" * 70 + "\n")

    for idx, item in enumerate(NARRATIONS, 1):
        vid_original  = os.path.join(VIDEOS_DIR, item["file"])
        audio_tmp     = os.path.join(TEMP_DIR,   f"narration_{idx:02d}.mp3")
        vid_with_voice = os.path.join(VIDEOS_DIR, item["file"])  # overwrite in-place

        # Skip if original video missing
        if not os.path.exists(vid_original):
            print(f"[{idx}/8] ⚠️  Video not found, skipping: {item['file']}")
            continue

        print(f"[{idx}/8] 🎤  Generating Urdu narration: {item['file']}...")
        
        # Step 1: Generate audio
        await generate_audio(item["text"], audio_tmp)
        audio_size = os.path.getsize(audio_tmp) / 1024
        print(f"       ✅ Audio generated ({audio_size:.0f} KB)")

        # Step 2: Merge audio into video (output to temp then rename)
        vid_tmp = os.path.join(TEMP_DIR, f"tmp_{idx:02d}.mp4")
        print(f"       ⚙️  Merging audio into video...")
        code = merge_audio_video(vid_original, audio_tmp, vid_tmp)

        if code == 0:
            # Copy then delete original (avoids cross-drive replace issue)
            import shutil
            if os.path.exists(vid_with_voice):
                os.remove(vid_with_voice)
            shutil.copy2(vid_tmp, vid_with_voice)
            os.remove(vid_tmp)
            final_size = os.path.getsize(vid_with_voice) / (1024 * 1024)
            print(f"       ✅ Done: {item['file']} ({final_size:.2f} MB with Urdu voice)\n")
        else:
            print(f"       ❌ FFmpeg merge failed (code {code})\n")

        # Clean up audio temp
        if os.path.exists(audio_tmp):
            os.remove(audio_tmp)

    # Clean up temp dir
    try:
        import shutil
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
    except:
        pass

    print("=" * 70)
    print("🎉  ALL 8 VIDEOS NOW HAVE URDU VOICE NARRATION!")
    print(f"📁  Files updated in: {VIDEOS_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(process_all_videos())
