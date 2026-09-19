#!/usr/bin/env python3
"""
Script de Teste de Carga e Estresse (Stress & Load Testing) - Service Desk API
Dispara requisicoes simultaneas multithread contra os endpoints da API Express,
avaliando latencia, throughput (RPS) e validacao de regras sob carga.
"""

import sys
import time
import json
import statistics
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

# Garante suporte a UTF-8 no stdout em terminais Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_URL = "http://localhost:3000/chamados"
TOTAL_REQUESTS = 60
CONCURRENT_WORKERS = 10

# Cenarios de teste: validos (espera 201) e invalidos (espera 400)
CENARIOS = [
    # Validos (espera 201)
    {"titulo": "Falha na sincronizacao de dados cadastrais", "valido": True, "esperado": 201},
    {"titulo": "Monitoramento de memoria excedeu 85% no servidor", "valido": True, "esperado": 201},
    {"titulo": "Erro ao carregar lista de usuarios ativos", "valido": True, "esperado": 201},
    {"titulo": "Instabilidade intermitente no link de internet", "valido": True, "esperado": 201},
    {"titulo": "Atualizacao de versao de biblioteca de seguranca", "valido": True, "esperado": 201},
    {"titulo": "Chamado com exatamente cinco", "valido": True, "esperado": 201},
    # Invalidos (espera 400)
    {"titulo": "Bug", "valido": False, "esperado": 400},
    {"titulo": "   ", "valido": False, "esperado": 400},
    {"titulo": "", "valido": False, "esperado": 400},
    {"titulo": "X" * 105, "valido": False, "esperado": 400}
]

def disparar_requisicao(index: int) -> dict:
    cenario = CENARIOS[index % len(CENARIOS)]
    payload = json.dumps({
        "titulo": cenario["titulo"],
        "descricao": f"Teste de estresse automatico - Requisicao #{index}"
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    inicio = time.perf_counter()
    status_retornado = None
    erro_msg = None

    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            status_retornado = res.status
    except urllib.error.HTTPError as e:
        status_retornado = e.code
    except urllib.error.URLError as e:
        erro_msg = str(e)

    fim = time.perf_counter()
    duracao_ms = (fim - inicio) * 1000

    sucesso_validacao = (status_retornado == cenario["esperado"])

    return {
        "index": index,
        "cenario": cenario,
        "status": status_retornado,
        "esperado": cenario["esperado"],
        "sucesso": sucesso_validacao,
        "latencia_ms": duracao_ms,
        "erro": erro_msg
    }

def main():
    print("\n" + "=" * 65)
    print("[SERVICE DESK API] Teste de Carga & Estresse Multithread")
    print("=" * 65)
    print(f">> Alvo:                 {API_URL}")
    print(f">> Total de Requisicoes: {TOTAL_REQUESTS}")
    print(f">> Threads Concorrentes: {CONCURRENT_WORKERS}")
    print("=" * 65)
    print("\n>> Executando disparos concorrentes...\n")

    inicio_global = time.perf_counter()
    resultados = []

    with ThreadPoolExecutor(max_workers=CONCURRENT_WORKERS) as executor:
        futures = [executor.submit(disparar_requisicao, i + 1) for i in range(TOTAL_REQUESTS)]

        for f in as_completed(futures):
            res = f.result()
            resultados.append(res)
            simbolo = "OK" if res["sucesso"] else "FAIL"
            print(f"  [{simbolo}] Req #{res['index']:02d} -> HTTP {res['status']} (esperado {res['esperado']}) em {res['latencia_ms']:.1f}ms")

    fim_global = time.perf_counter()
    duracao_total = fim_global - inicio_global

    # Calculos Estatisticos
    latencias = [r["latencia_ms"] for r in resultados if r["status"] is not None]
    sucessos = sum(1 for r in resultados if r["sucesso"])
    falhas = TOTAL_REQUESTS - sucessos
    taxa_sucesso = (sucessos / TOTAL_REQUESTS) * 100
    rps = TOTAL_REQUESTS / duracao_total if duracao_total > 0 else 0

    print("\n" + "=" * 65)
    print("RELATORIO EXECUTIVO DE DESEMPENHO E RESILIENCIA")
    print("=" * 65)
    print(f">> Tempo Total de Execucao:     {duracao_total:.2f} s")
    print(f">> Throughput Medio:             {rps:.1f} req/s (RPS)")
    print(f">> Taxa de Sucesso Validacao:   {taxa_sucesso:.1f}% ({sucessos}/{TOTAL_REQUESTS})")
    print(f">> Falhas / Divergencias:       {falhas}")

    if latencias:
        print("\n>> Latencia por Requisicao:")
        print(f"   * Minima:   {min(latencias):.1f} ms")
        print(f"   * Media:    {statistics.mean(latencias):.1f} ms")
        print(f"   * Mediana:  {statistics.median(latencias):.1f} ms")
        print(f"   * Maxima:   {max(latencias):.1f} ms")
        if len(latencias) > 1:
            print(f"   * Desvio:   {statistics.stdev(latencias):.1f} ms")

    print("=" * 65)
    if taxa_sucesso == 100.0:
        print("[SUCESSO TOTAL] A API resistiu com 100% de conformidade sob carga!")
    else:
        print("[ALERTA] Houve divergencias durante a execucao do teste.")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    main()
