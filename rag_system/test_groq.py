from groq import Groq

client = Groq(
    api_key="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"
)

response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)