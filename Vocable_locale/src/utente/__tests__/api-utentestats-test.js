const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { createUtentestatsControllerFn, statGetterControllerFn, updateUtentestatsControllerFn } = require('../utentestatsController');
const utentestatsServices = require('../utentestatsServices');
const utenteService = require('../utenteServices');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authenticateToken = require('../authenticateToken');

const app = express();
app.use(express.json());

// Applica il middleware di autenticazione alle rotte
app.post('/create-stats', authenticateToken, createUtentestatsControllerFn);
app.get('/stats', authenticateToken, statGetterControllerFn);
app.put('/update-stats', authenticateToken, updateUtentestatsControllerFn);

// Mocking dei services
jest.mock('../utentestatsServices');
jest.mock('../utenteServices');
jest.mock('jsonwebtoken');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterEach(async () => {
    await mongoose.connection.dropDatabase();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Utentestats Controller Tests', () => {
    const validToken = 'valid-token';
    const invalidToken = 'invalid-token';
    const decodedUser = { email: 'test@example.com' };

    beforeEach(() => {
        // Mock del metodo jwt.verify
        require('jsonwebtoken').verify.mockImplementation((token, secret, callback) => {
            if (token === validToken) {
                callback(null, decodedUser);
            } else {
                callback(new Error('Invalid token'), null);
            }
        });
    });

    describe('Middleware authenticateToken', () => {
        it('should return 401 if no token is provided', async () => {
            const response = await request(app).get('/stats');

            expect(response.statusCode).toBe(401);
        });

        it('should return 403 if token is invalid', async () => {
            const response = await request(app)
                .get('/stats')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.statusCode).toBe(403);
        });

        it('should call the API if token is valid', async () => {
            // Mock dei services
            utentestatsServices.findStatsByEmail.mockResolvedValue({
                email: 'test@example.com',
                totalgames: 10,
                gameswon: 6,
                gameslost: 4,
                won1: 1,
                won2: 2,
                won3: 1,
                won4: 1,
                won5: 0,
                won6: 1
            });

            utenteService.findNicknameByEmail.mockResolvedValue('testuser');

            const response = await request(app)
                .get('/stats')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                email: 'test@example.com',
                nickname: 'testuser',
                totalgames: 10,
                gameswon: 6,
                gameslost: 4,
                won1: 1,
                won2: 2,
                won3: 1,
                won4: 1,
                won5: 0,
                won6: 1
            });
        });
    });

    describe('POST /create-stats', () => {
        it('should create utentestats successfully', async () => {
            // Mock service method
            utentestatsServices.createUtentestatsDBService.mockResolvedValue(true);

            const response = await request(app)
                .post('/create-stats')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ email: 'test@example.com', totalgames: 0 });

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                status: true,
                message: "Utentestats creato con successo"
            });
        });

        it('should return an error when creation fails', async () => {
            // Mock service method
            utentestatsServices.createUtentestatsDBService.mockResolvedValue(false);

            const response = await request(app)
                .post('/create-stats')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ email: 'test@example.com', totalgames: 0 });

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                status: false,
                message: "Errore: Impossibile creare l'utentestats"
            });
        });
    });

    describe('GET /stats', () => {
        it('should return user stats successfully', async () => {
            // Mock service methods
            utentestatsServices.findStatsByEmail.mockResolvedValue({
                email: 'test@example.com',
                totalgames: 10,
                gameswon: 6,
                gameslost: 4,
                won1: 1,
                won2: 2,
                won3: 1,
                won4: 1,
                won5: 0,
                won6: 1
            });

            utenteService.findNicknameByEmail.mockResolvedValue('testuser');

            const response = await request(app)
                .get('/stats')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                email: 'test@example.com',
                nickname: 'testuser',
                totalgames: 10,
                gameswon: 6,
                gameslost: 4,
                won1: 1,
                won2: 2,
                won3: 1,
                won4: 1,
                won5: 0,
                won6: 1
            });
        });

        it('should return 404 when stats are not found', async () => {
            // Mock service method
            utentestatsServices.findStatsByEmail.mockResolvedValue(null);

            const response = await request(app)
                .get('/stats')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.statusCode).toBe(404);
            expect(response.body).toEqual({ msg: 'Statistiche irreperibili' });
        });

        it('should return 404 when nickname is not found', async () => {
            // Mock service methods
            utentestatsServices.findStatsByEmail.mockResolvedValue({
                email: 'test@example.com',
                totalgames: 10,
                gameswon: 6,
                gameslost: 4,
                won1: 1,
                won2: 2,
                won3: 1,
                won4: 1,
                won5: 0,
                won6: 1
            });

            utenteService.findNicknameByEmail.mockResolvedValue(null);

            const response = await request(app)
                .get('/stats')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.statusCode).toBe(404);
            expect(response.body).toEqual({ msg: 'Nickname non trovato' });
        });
    });

    describe('PUT /update-stats', () => {
        it('should update stats successfully', async () => {
            // Mock service method to return a successful update
            utentestatsServices.updateUtentestatsDBService.mockResolvedValue({
                status: true,
                message: 'Statistiche aggiornate con successo'
            });
    
            const response = await request(app)
                .put('/update-stats')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ won: true, attempts: 3 });
    
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                status: true,
                message: 'Statistiche aggiornate con successo'
            });
        });
    
        it('should return 404 when update fails due to missing stats', async () => {
            // Mock service method to simulate a failure due to missing stats
            utentestatsServices.updateUtentestatsDBService.mockResolvedValue({
                status: false,
                message: 'Statistiche irreperibili'
            });
    
            const response = await request(app)
                .put('/update-stats')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ won: true, attempts: 3 });
    
            expect(response.statusCode).toBe(404);
            expect(response.body).toEqual({
                status: false,
                message: 'Statistiche irreperibili'
            });
        });
    
        it('should return 500 when there is a server error', async () => {
            // Mock service method to throw an error simulating a server issue
            utentestatsServices.updateUtentestatsDBService.mockRejectedValue(new Error('Errore del server'));
    
            const response = await request(app)
                .put('/update-stats')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ won: true, attempts: 3 });
    
            expect(response.statusCode).toBe(500);
            expect(response.body).toEqual({
                status: false,
                message: 'Errore del server'
            });
        });
    });
});    