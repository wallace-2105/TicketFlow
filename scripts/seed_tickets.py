#!/usr/bin/env python3
"""
Script de Populacao de Dados (Seed) - Service Desk API
Gera chamados realistas de suporte de TI na API Express.
"""

import sys
import json
import urllib.request
import urllib.error
import time

# Garante suporte a UTF-8 no stdout em terminais Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_URL = "http://localhost:3000/chamados"

CHAMADOS_EXEMPLO = [
    {
        "titulo": "Falha na conexao VPN corporativa",
        "descricao": "Usuarios do setor financeiro nao conseguem autenticar na VPN apos a ultima atualizacao de seguranca."
    },
    {
        "titulo": "Lentidao excessiva nas consultas ao banco de dados",
        "descricao": "Queries da tabela de pedidos estao levando mais de 15 segundos para responder no ambiente de homologacao."
    },
    {
        "titulo": "Solicitacao de provisionamento de acesso ao cluster K8s",
        "descricao": "Novo desenvolvedor da equipe de backend precisa de permissao de leitura no namespace de staging."
    },
    {
        "titulo": "Erro 500 ao emitir relatorio fiscal mensal",
        "descricao": "Ao selecionar o periodo de agosto no modulo financeiro, o sistema apresenta tela de erro inesperado."
    },
    {
        "titulo": "Instalacao e renovacao de certificado SSL",
        "descricao": "O certificado do subdominio api.empresa.local ira expirar em 5 dias."
    },
    {
        "titulo": "Bloqueio preventivo de conta por tentativas de login",
        "descricao": "Conta de servico do pipeline teve mais de 10 tentativas com senha incorreta e foi bloqueada."
    },
    {
        "titulo": "Substituicao de switch de rede no rack principal",
        "descricao": "Portas 12 e 14 apresentando perda de pacotes intermitente na sala dos servidores."
    },
    {
        "titulo": "Configuracao de backup diario automatizado",
        "descricao": "Necessario ajustar o agendamento do dump do PostgreSQL para as 03:00 da manha."
    }
]

def main():
    print("\n" + "=" * 60)
    print("[SERVICE DESK] Seed Script - Populador de Chamados")
    print("=" * 60)
    print(f">> Conectando em: {API_URL} ...\n")

    sucesso = 0
    falha = 0

    for idx, chamado in enumerate(CHAMADOS_EXEMPLO, 1):
        payload = json.dumps(chamado).encode("utf-8")
        req = urllib.request.Request(
            API_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 201:
                    dados = json.loads(res.read().decode("utf-8"))
                    id_criado = dados.get("chamado", {}).get("id", "?")
                    print(f"  [OK] Chamado #{id_criado:02d} criado: '{chamado['titulo']}'")
                    sucesso += 1
                else:
                    print(f"  [!] Resposta inesperada ({res.status}): '{chamado['titulo']}'")
                    falha += 1
        except urllib.error.URLError as e:
            print(f"  [ERRO] Falha ao enviar chamado {idx}: {e}")
            falha += 1
            if "Connection refused" in str(e) or "actively refused" in str(e):
                print("\n[ALERTA] O servidor nao esta rodando na porta 3000!")
                print("   Inicie o servidor com: npm run dev")
                sys.exit(1)

        time.sleep(0.08)

    print("\n" + "-" * 60)
    print(f">> Resumo do Seed: {sucesso} chamados criados com sucesso, {falha} falhas.")
    print(">> Acesse o painel web: http://localhost:3000/dashboard/")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
