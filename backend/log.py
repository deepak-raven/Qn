import os
from groq import Groq

# Reads the key from the GROQ_API_KEY environment variable
api_key = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=api_key) if api_key else None

SYSTEM_PROMPT = "You are a helpful assistant named varina."

def ask(question):
    if not client:
        return "GROQ_API_KEY environment variable is not set."
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    print("Groq Chatbot (type 'bye' to quit)")
    while True:
        user_input = input("You: ")
        if user_input.lower() == "bye":
            break
        print("Bot:", ask(user_input))