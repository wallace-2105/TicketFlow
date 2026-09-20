import express, { Request, Response } from 'express';
import path from 'path';
import { validarTituloChamado } from './validator';

export type StatusChamado = 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'CANCELADO';

export const STATUS_VALIDOS: StatusChamado[] = ['ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO', 'CANCELADO'];

export interface Chamado {
  id: number;
  titulo: string;
  descricao?: string;
  status: StatusChamado;
  responsavel?: string;
  resolucao?: string;
  dataCriacao: string;
  dataAtualizacao?: string;
}

export const chamados: Chamado[] = [];

export function limparChamados(): void {
  chamados.length = 0;
}

export const app = express();

app.use(express.json());

// Painel visual interativo no navegador
app.use('/dashboard', express.static(path.join(__dirname, '../public')));

// Rota raiz original (compatível com os requisitos iniciais)
app.get('/', (_req: Request, res: Response) => {
  res.send('Chegou na rota raiz');
});

// Listagem de chamados
app.get('/chamados', (_req: Request, res: Response) => {
  res.status(200).json(chamados);
});

// Busca de chamado por ID
app.get('/chamados/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const chamado = chamados.find(c => c.id === id);

  if (!chamado) {
    res.status(404).json({ erro: 'Chamado não encontrado.' });
    return;
  }

  res.status(200).json(chamado);
});

// Criação de chamado com validação
app.post('/chamados', (req: Request, res: Response) => {
  const { titulo, descricao, responsavel } = req.body || {};

  if (!titulo || typeof titulo !== 'string' || !validarTituloChamado(titulo)) {
    res.status(400).json({
      erro: 'Título inválido. O título deve possuir entre 5 e 100 caracteres.'
    });
    return;
  }

  const novoChamado: Chamado = {
    id: chamados.length + 1,
    titulo: titulo.trim(),
    descricao: descricao ? String(descricao).trim() : '',
    status: 'ABERTO',
    responsavel: responsavel ? String(responsavel).trim() : undefined,
    dataCriacao: new Date().toISOString()
  };

  chamados.push(novoChamado);

  res.status(201).json({
    mensagem: 'Chamado criado com sucesso',
    chamado: novoChamado
  });
});

// Atualização de status do chamado (Workflow de Atendimento)
app.patch('/chamados/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const chamado = chamados.find(c => c.id === id);

  if (!chamado) {
    res.status(404).json({ erro: 'Chamado não encontrado.' });
    return;
  }

  const { status, responsavel } = req.body || {};

  if (!status || !STATUS_VALIDOS.includes(status)) {
    res.status(400).json({
      erro: `Status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}`
    });
    return;
  }

  chamado.status = status;
  if (responsavel) {
    chamado.responsavel = String(responsavel).trim();
  }
  chamado.dataAtualizacao = new Date().toISOString();

  res.status(200).json({
    mensagem: 'Status atualizado com sucesso',
    chamado
  });
});

// Conclusão e resolução técnica do chamado
app.patch('/chamados/:id/resolucao', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const chamado = chamados.find(c => c.id === id);

  if (!chamado) {
    res.status(404).json({ erro: 'Chamado não encontrado.' });
    return;
  }

  const { resolucao, responsavel } = req.body || {};

  if (!resolucao || typeof resolucao !== 'string' || resolucao.trim().length === 0) {
    res.status(400).json({
      erro: 'A descrição da resolução técnica é obrigatória.'
    });
    return;
  }

  chamado.resolucao = resolucao.trim();
  chamado.status = 'RESOLVIDO';
  if (responsavel) {
    chamado.responsavel = String(responsavel).trim();
  }
  chamado.dataAtualizacao = new Date().toISOString();

  res.status(200).json({
    mensagem: 'Chamado resolvido com sucesso',
    chamado
  });
});

// Exclusão de chamado
app.delete('/chamados/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = chamados.findIndex(c => c.id === id);

  if (index === -1) {
    res.status(404).json({ erro: 'Chamado não encontrado.' });
    return;
  }

  chamados.splice(index, 1);

  res.status(200).json({
    mensagem: 'Chamado excluído com sucesso'
  });
});
