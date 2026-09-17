import request from 'supertest';
import { app, limparChamados } from './app';

describe('Testes de Integração da API Express', () => {
  beforeEach(() => {
    limparChamados();
  });

  describe('GET /', () => {
    test('deve responder com status 200 e texto de confirmação', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Chegou na rota raiz');
    });
  });

  describe('POST /chamados', () => {
    test('deve criar um chamado com sucesso quando o título for válido', async () => {
      const payload = {
        titulo: 'Erro ao emitir relatório mensal',
        descricao: 'Ao clicar no botão emitir, o sistema trava.'
      };

      const response = await request(app)
        .post('/chamados')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('mensagem', 'Chamado criado com sucesso');
      expect(response.body.chamado).toMatchObject({
        id: 1,
        titulo: payload.titulo,
        descricao: payload.descricao
      });
      expect(response.body.chamado).toHaveProperty('dataCriacao');
    });

    test('deve criar um chamado válido apenas com título (sem descrição)', async () => {
      const response = await request(app)
        .post('/chamados')
        .send({ titulo: 'Problema na impressora' });

      expect(response.status).toBe(201);
      expect(response.body.chamado.titulo).toBe('Problema na impressora');
      expect(response.body.chamado.descricao).toBe('');
    });

    test('deve rejeitar quando o título for menor que 5 caracteres', async () => {
      const response = await request(app)
        .post('/chamados')
        .send({ titulo: 'Bug' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('erro');
      expect(response.body.erro).toContain('entre 5 e 100 caracteres');
    });

    test('deve rejeitar quando o título for vazio ou apenas espaços', async () => {
      const response = await request(app)
        .post('/chamados')
        .send({ titulo: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('erro');
    });

    test('deve rejeitar quando nenhum título for enviado no corpo', async () => {
      const response = await request(app)
        .post('/chamados')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('erro');
    });

    test('deve rejeitar quando o título exceder 100 caracteres', async () => {
      const tituloGigante = 'A'.repeat(101);

      const response = await request(app)
        .post('/chamados')
        .send({ titulo: tituloGigante });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('erro');
    });
  });

  describe('GET /chamados', () => {
    test('deve retornar lista vazia inicialmente', async () => {
      const response = await request(app).get('/chamados');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('deve retornar a lista de chamados cadastrados', async () => {
      await request(app)
        .post('/chamados')
        .send({ titulo: 'Primeiro chamado válido' });

      await request(app)
        .post('/chamados')
        .send({ titulo: 'Segundo chamado válido' });

      const response = await request(app).get('/chamados');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].titulo).toBe('Primeiro chamado válido');
      expect(response.body[1].titulo).toBe('Segundo chamado válido');
    });
  });
});
