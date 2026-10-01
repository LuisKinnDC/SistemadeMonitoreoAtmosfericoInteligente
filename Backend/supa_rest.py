"""
supa_rest.py
==========================================================
Helper mínimo para ESCRIBIR en Supabase vía la API REST (PostgREST)
usando solo la librería estándar (urllib).

¿Por qué existe? Con las claves nuevas de Supabase (formato
"sb_publishable_...", que no son JWT), el cliente supabase-py resuelve
la petición a un rol que las políticas RLS de anon/authenticated no
cubren, y los INSERT fallan con 42501. La misma petición por REST directo
(curl/urllib) sí se resuelve como 'anon' y funciona. Este helper evita ese
problema para las operaciones de escritura del backend.

La LECTURA se puede seguir haciendo con supabase-py sin problema.
==========================================================
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error

try:
    import config
except ModuleNotFoundError:  # pragma: no cover
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent))
    import config


def _headers(extra: dict | None = None) -> dict:
    h = {
        "apikey": config.SUPABASE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _post(tabla: str, filas: list[dict], prefer: str) -> int:
    """POST genérico. Devuelve el nº de filas enviadas. Lanza en error HTTP."""
    config.validar_credenciales()
    url = f"{config.SUPABASE_URL}/rest/v1/{tabla}"
    body = json.dumps(filas, default=str).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers=_headers({"Prefer": prefer}), method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            _ = r.read()
        return len(filas)
    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", "ignore")[:300]
        raise RuntimeError(f"Supabase REST {e.code}: {detalle}") from None


def insertar(tabla: str, filas: list[dict], lote: int = 500) -> int:
    """INSERT por lotes. Devuelve total de filas insertadas."""
    total = 0
    for i in range(0, len(filas), lote):
        total += _post(tabla, filas[i:i + lote], prefer="return=minimal")
    return total


def upsert(tabla: str, filas: list[dict], on_conflict: str, lote: int = 500) -> int:
    """UPSERT (insert + update on conflict) por lotes."""
    total = 0
    config.validar_credenciales()
    for i in range(0, len(filas), lote):
        chunk = filas[i:i + lote]
        url = f"{config.SUPABASE_URL}/rest/v1/{tabla}?on_conflict={on_conflict}"
        body = json.dumps(chunk, default=str).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                _ = r.read()
            total += len(chunk)
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "ignore")[:300]
            raise RuntimeError(f"Supabase REST {e.code}: {detalle}") from None
    return total
