import asyncio
import app.database as database

async def check_db():
    await database.init_db()
    cursor = database.db["questions"].find({})
    questions = await cursor.to_list(length=10000)
    print(f"Total DB questions: {len(questions)}")
    for q in questions:
        txt = q.get("text", "")
        if "ples." in txt or txt.strip() == "ples." or len(txt) < 25 or txt.endswith("ples.") or txt.startswith("ples."):
            txt_safe = repr(txt).encode('ascii', 'backslashreplace').decode('ascii')
            print("---")
            print("Subject:", q.get("subject_code"), "Unit:", q.get("unit"), "Part:", q.get("part"), "KL:", q.get("kl"), "CO:", q.get("co"))
            print("Text:", txt_safe)

if __name__ == "__main__":
    asyncio.run(check_db())
