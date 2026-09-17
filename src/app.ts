import express, { Request, Response } from 'express';

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
