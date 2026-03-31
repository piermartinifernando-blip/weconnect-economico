import requests, time, os
from datetime import datetime, timezone
import urllib3
urllib3.disable_warnings()

ISPCUBE_URL  = "https://online25.ispcube.com"
ISPCUBE_KEY  = os.getenv("ISPCUBE_API_KEY")
ISPCUBE_CID  = os.getenv("ISPCUBE_CLIENT_ID")
ISPCUBE_USER = os.getenv("ISPCUBE_USERNAME")
ISPCUBE_PASS = os.getenv("ISPCUBE_PASSWORD")
SUPA_URL     = os.getenv("SUPABASE_URL")
SUPA_KEY     = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS_ISP = {"Content-Type":"application/json","Accept":"application/json","api-key":ISPCUBE_KEY,"client-id":ISPCUBE_CID,"login-type":"api","username":ISPCUBE_USER}
HEADERS_SB  = {"apikey":SUPA_KEY,"Authorization":f"Bearer {SUPA_KEY}","Content-Type":"application/json","Prefer":"resolution=merge-duplicates"}

def obtener_token():
    r = requests.post(f"{ISPCUBE_URL}/api/sanctum/token",headers=HEADERS_ISP,json={"username":ISPCUBE_USER,"password":ISPCUBE_PASS},verify=False,timeout=15)
    return r.json()["token"]

def bajar_clientes(token):
    h = {**HEADERS_ISP,"Authorization":f"Bearer {token}"}
    todos,offset = [],0
    while True:
        r = requests.get(f"{ISPCUBE_URL}/api/customers/customers_list?limit=100&offset={offset}",headers=h,verify=False,timeout=20)
        batch = r.json()
        if not isinstance(batch,list) or not batch: break
        todos.extend(batch)
        print(f"  offset {offset:>5} → +{len(batch)} | total: {len(todos)}")
        if len(batch)<100: break
        offset+=100
        time.sleep(0.15)
    return todos

def transformar(clientes):
    ahora = datetime.now(timezone.utc).isoformat()
    rows = []
    for c in clientes:
        conn = (c.get("connections") or [{}])[0]
        rows.append({"id":c.get("id"),"codigo":c.get("code"),"nombre":c.get("name"),"doc_number":c.get("doc_number"),"ciudad":(c.get("city") or {}).get("name"),"direccion":c.get("address"),"estado":c.get("status"),"bloqueado":int(c.get("block") or 0),"plan":c.get("plan_name"),"plan_precio":float(c.get("plan_price") or 0),"deuda":float(c.get("debt") or 0),"deuda_venc":float(c.get("duedebt") or 0),"telefono":(c.get("phones") or [{}])[0].get("number") if c.get("phones") else None,"email":(c.get("contact_emails") or [{}])[0].get("email") if c.get("contact_emails") else None,"fecha_alta":c.get("start_date"),"lat":c.get("lat"),"lng":c.get("lng"),"node":c.get("node_name"),"vendedor":conn.get("seller_name"),"conntype":conn.get("conntype"),"actualizado":ahora})
    return rows

def guardar_supabase(rows):
    ok = 0
    for i in range(0,len(rows),200):
        batch = rows[i:i+200]
        r = requests.post(f"{SUPA_URL}/rest/v1/clientes_ispcube",headers=HEADERS_SB,json=batch,timeout=30)
        if r.status_code in (200,201): ok+=len(batch); print(f"  batch {i//200+1} → {len(batch)} OK")
        else: print(f"  ⚠️ batch {i//200+1} error {r.status_code}: {r.text[:150]}")
    return ok

if __name__ == "__main__":
    print(f"\n🚀 SYNC WeConnect — {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
    token    = obtener_token(); print("Token OK")
    clientes = bajar_clientes(token)
    rows     = transformar(clientes)
    ok       = guardar_supabase(rows)
    print(f"\n✅ {ok} clientes sincronizados en Supabase\n")
