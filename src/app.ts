import express, { Request, Response } from 'express';
import { validarTituloChamado } from './validator';

export interface Chamado {
  id: number;
  titulo: string;
  descricao?: string;
  dataCriacao: string;
}

export const chamados: Chamado[] = [];

export function limparChamados(): void {
  chamados.length = 0;
}

export const app = express();

app.use(express.json());

// Rota raiz original (compatível com os requisitos iniciais)
app.get('/', (_req: Request, res: Response) => {
  res.send('Chegou na rota raiz');
});

// Listagem de chamados
app.get('/chamados', (_req: Request, res: Response) => {
  res.status(200).json(chamados);
});

// Criação de chamado com validação
app.post('/chamados', (req: Request, res: Response) => {
  const { titulo, descricao } = req.body || {};

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
    dataCriacao: new Date().toISOString()
  };

  chamados.push(novoChamado);

  res.status(201).json({
    mensagem: 'Chamado criado com sucesso',
    chamado: novoChamado
  });
});
