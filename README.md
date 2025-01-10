# Nest-Whisper
How to implement whisper api in nestjs gateway

1. Download/Clone the code
2. Install packages by npm install
3. Compile using npm run start

Note: Replace your openAI key in the audio.gateway.ts 
```await fetch(
        "https://api.whisper.ai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `<place your key here>`,
          },
          body: formData,
        }
      );

