import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';
import fetch from 'node-fetch';

@WebSocketGateway(3009, { cors: true })
export class AudioGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor() { }

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
  }

  @SubscribeMessage('uploadAudio')
  async handleAudioUpload(@MessageBody() data: { fileBuffer: any }) {
    // console.log('Received data:', data); // Check if fileBuffer is received properly
    if (!data.fileBuffer) {
      console.error('Empty fileBuffer received.');
      return { status: 'error', message: 'No audio data received.' };
    }

    try {
      // Create main filename with today's date
      const now = new Date();
      const audioFileName = `${now.toISOString().split('T')[0]}.wav`;

      // Create/append to main audio file
      const baseDir = path.join(process.cwd(), 'uploads');
      const audioFilePath = path.join(baseDir, audioFileName);

      // Create base directory if it doesn't exist
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      // Create main file if it doesn't exist, then append buffer
      if (!fs.existsSync(audioFilePath)) {
        await fs.promises.writeFile(audioFilePath, data.fileBuffer);
      } else {
        await fs.promises.appendFile(audioFilePath, data.fileBuffer);
      }

      // Convert both session and main audio files to text

      const { transcription, segments } = await this.convertAudioToText(audioFilePath);


      // Send encrypted data back to client
      this.server.emit('audioResponse', {
        status: 'success',
        transcription: transcription,
        segments: segments,
        timestamp: now.toISOString(),
      });
      return { status: 'success' };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Convert audio to text and return transcription and segments
  async convertAudioToText(audioFilePath: string): Promise<{ transcription: any; segments: any; }> {
    try {

      const formData = new FormData();
      const fileBuffer = fs.readFileSync(audioFilePath);
      if (fileBuffer.length === 0) {
        throw new Error('File is empty, cannot send to API');
      }
      formData.append("file", fileBuffer, {
        filename: `recording_${Date.now()}.wav`,
        contentType: "audio/wav"
      });

      formData.append("model", "whisper-1");
      formData.append("language", "en");
      formData.append("response_format", "verbose_json");

      const response = await fetch(
        "https://api.whisper.ai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `<place your key here>`,
          },
          body: formData,
        }
      );
      // Check for hallucinations or irrelevant responses
      const data = await response.json();
      const isOnlySpecialCharsOrSingleChar = (text: string) => /^[^a-zA-Z0-9]*$/.test(text) || text.length === 1;

      if (!data.text || data.text.trim() === '' || isOnlySpecialCharsOrSingleChar(data.text)) {
        console.error('API returned an irrelevant, empty, or single character response:', data);
        throw new Error('API returned an irrelevant, empty, or single character response');
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      return { transcription: data.text, segments: data.segments };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio file: ${error.message}`);
    }
  }



}
