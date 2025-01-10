import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import { AudioGateway } from '../src/gateways/audio.gateway';

describe('AudioGateway (e2e)', () => {
    let app: INestApplication;
    let socket: Socket;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        await app.listen(3000);

        // Create socket client
        socket = io('http://localhost:3000', {
            transports: ['websocket'],
        });
    });

    afterAll(async () => {
        socket.close();
        await app.close();
    });

    it('should connect to websocket server', (done) => {
        socket.on('connect', () => {
            expect(socket.connected).toBeTruthy();
            done();
        });
    });

    it('should handle audioData event', (done) => {
        const mockAudioData = {
            data: new ArrayBuffer(16),
            timestamp: Date.now(),
        };

        socket.emit('audioData', mockAudioData);

        socket.on('audioData', (data) => {
            expect(data).toBeDefined();
            expect(data.timestamp).toBeDefined();
            done();
        });
    });

    it('should handle join room event', (done) => {
        const roomId = 'test-room';

        socket.emit('joinRoom', { roomId });

        socket.on('joinedRoom', (data) => {
            expect(data.roomId).toBe(roomId);
            done();
        });
    });

    it('should handle leave room event', (done) => {
        const roomId = 'test-room';

        socket.emit('leaveRoom', { roomId });

        socket.on('leftRoom', (data) => {
            expect(data.roomId).toBe(roomId);
            done();
        });
    });
}); 