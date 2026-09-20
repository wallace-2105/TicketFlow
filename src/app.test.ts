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
        descricao: payload.descricao,
        status: 'ABERTO'
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
      expect(response.body.chamado.status).toBe('ABERTO');
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

  describe('GET /chamados/:id', () => {
    test('deve retornar 404 quando o chamado não existir', async () => {
      const response = await request(app).get('/chamados/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('erro');
    });

    test('deve retornar os detalhes do chamado existente', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado para busca por ID' });

      const id = postRes.body.chamado.id;
      const getRes = await request(app).get(`/chamados/${id}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(id);
      expect(getRes.body.titulo).toBe('Chamado para busca por ID');
    });
  });

  describe('PATCH /chamados/:id/status (Workflow de Atendimento)', () => {
    test('deve atualizar o status para EM_ATENDIMENTO com técnico responsável', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado para atendimento' });

      const id = postRes.body.chamado.id;

      const patchRes = await request(app)
        .patch(`/chamados/${id}/status`)
        .send({ status: 'EM_ATENDIMENTO', responsavel: 'Carlos Silva' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.chamado.status).toBe('EM_ATENDIMENTO');
      expect(patchRes.body.chamado.responsavel).toBe('Carlos Silva');
      expect(patchRes.body.chamado).toHaveProperty('dataAtualizacao');
    });

    test('deve rejeitar status inválido', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado para teste de erro' });

      const id = postRes.body.chamado.id;

      const patchRes = await request(app)
        .patch(`/chamados/${id}/status`)
        .send({ status: 'STATUS_INEXISTENTE' });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body).toHaveProperty('erro');
    });

    test('deve retornar 404 para chamado inexistente', async () => {
      const patchRes = await request(app)
        .patch('/chamados/9999/status')
        .send({ status: 'CANCELADO' });

      expect(patchRes.status).toBe(404);
      expect(patchRes.body).toHaveProperty('erro');
    });
  });

  describe('PATCH /chamados/:id/resolucao', () => {
    test('deve resolver o chamado registrando a solução técnica', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado que será resolvido' });

      const id = postRes.body.chamado.id;

      const patchRes = await request(app)
        .patch(`/chamados/${id}/resolucao`)
        .send({
          resolucao: 'Reiniciado o serviço de rede e atualizado cache DNS.',
          responsavel: 'Suporte N2'
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.chamado.status).toBe('RESOLVIDO');
      expect(patchRes.body.chamado.resolucao).toContain('Reiniciado o serviço');
      expect(patchRes.body.chamado.responsavel).toBe('Suporte N2');
    });

    test('deve rejeitar resolução vazia', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado resolução vazia' });

      const id = postRes.body.chamado.id;

      const patchRes = await request(app)
        .patch(`/chamados/${id}/resolucao`)
        .send({ resolucao: '   ' });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body).toHaveProperty('erro');
    });
  });

  describe('DELETE /chamados/:id', () => {
    test('deve excluir um chamado com sucesso', async () => {
      const postRes = await request(app)
        .post('/chamados')
        .send({ titulo: 'Chamado para exclusão' });

      const id = postRes.body.chamado.id;

      const deleteRes = await request(app).delete(`/chamados/${id}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body).toHaveProperty('mensagem', 'Chamado excluído com sucesso');

      const getRes = await request(app).get(`/chamados/${id}`);
      expect(getRes.status).toBe(404);
    });

    test('deve retornar 404 ao tentar excluir chamado inexistente', async () => {
      const deleteRes = await request(app).delete('/chamados/8888');
      expect(deleteRes.status).toBe(404);
    });
  });
});
